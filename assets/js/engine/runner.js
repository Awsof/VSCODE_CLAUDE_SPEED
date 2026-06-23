/**
 * RunnerEngine — Executor de requisições SOAP
 * Responsável por executar testes contra endpoints
 */
const RunnerEngine = (() => {
  /**
   * Estado compartilhado
   */
  const state = {
    isRunning: false,
    activeAbort: null,
    currentSequence: 0,
    totalRequests: 0,
    completedRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    listeners: []
  };

  /**
   * Registrar listener para eventos
   */
  const on = (eventType, callback) => {
    state.listeners.push({ eventType, callback });
  };

  /**
   * Disparar evento
   */
  const _emit = (eventType, data) => {
    state.listeners
      .filter(l => l.eventType === eventType)
      .forEach(l => {
        try {
          l.callback(data);
        } catch (error) {
          console.error(`[RunnerEngine] Erro em listener ${eventType}:`, error);
        }
      });
  };

  /**
   * Executar uma requisição SOAP individual
   */
  const executeRequest = async (profile, attendanceNumber, payload, config) => {
    const t0 = performance.now();
    const requestId = ++state.currentSequence;
    let timeoutHandle;

    try {
      // Validar URL
      if (!UtilsEngine.isValidURL(profile.url)) {
        throw new Error(`URL inválida: ${profile.url}`);
      }

      // Preparar headers SOAP como objeto simples (para serializar ao proxy)
      const headersObj = { 'Content-Type': ConfigEngine.get('SOAP_CONTENT_TYPE') };
      if (profile.soapAction) headersObj['SOAPAction'] = profile.soapAction;

      const timeoutMs = (config.timeout || ConfigEngine.get('DEFAULT_REQUEST_TIMEOUT')) * 1000;

      // AbortController para o fetch ao proxy (com margem extra sobre o timeout SOAP)
      const controller = new AbortController();
      timeoutHandle = setTimeout(() => controller.abort(), timeoutMs + 10000);

      // Roteamento via proxy (evita CORS direto ao endpoint SOAP)
      const proxyResponse = await fetch('/api/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUrl: profile.url, headers: headersObj, payload, timeoutMs }),
        signal: controller.signal
      });

      clearTimeout(timeoutHandle);

      if (!proxyResponse.ok) {
        const errBody = await proxyResponse.json().catch(() => ({}));
        throw new Error(`Proxy HTTP ${proxyResponse.status}: ${errBody.error || proxyResponse.statusText}`);
      }

      const proxyResult = await proxyResponse.json();
      const responseBody = proxyResult.responseBody;
      const duration = proxyResult.duration ?? Math.round(performance.now() - t0);
      const success = proxyResult.success;
      const statusCode = proxyResult.statusCode;

      if (!success) {
        console.warn('[RunnerEngine] Falha reportada pelo proxy:', {
          targetUrl: profile.url,
          statusCode,
          isTimeout: proxyResult.isTimeout,
          errorDetail: proxyResult.errorDetail,
          responseSnippet: responseBody ? responseBody.slice(0, 300) : null
        });
      }

      // Extrair numero de atendimento do DB (se configurado)
      const xmlTag = profile.xmlTag || 'diag:NumeroAtendimentoApoiado';
      const numDB = responseBody ? XMLEngine.extractTag(responseBody, xmlTag, null) : null;

      const result = {
        requestId,
        profileId: profile.id,
        profileName: profile.nome,
        profileCode: profile.codigo,
        attendanceNumber,
        numDB,
        duration,
        statusCode,
        success,
        isTimeout: proxyResult.isTimeout || false,
        errorDetail: success ? null : (proxyResult.errorDetail || `HTTP ${statusCode}`),
        requestPayload: payload,
        responseBody,
        timestamp: new Date().toISOString()
      };

      state.completedRequests++;
      if (success) {
        state.successfulRequests++;
      } else {
        state.failedRequests++;
      }

      _emit('request-complete', result);
      return result;

    } catch (error) {
      clearTimeout(timeoutHandle);
      const duration = Math.round(performance.now() - t0);
      const isTimeout = error.name === 'AbortError';

      state.completedRequests++;
      state.failedRequests++;

      const result = {
        requestId,
        profileId: profile.id,
        profileName: profile.nome,
        profileCode: profile.codigo,
        attendanceNumber,
        numDB: null,
        duration,
        statusCode: null,
        success: false,
        isTimeout,
        errorDetail: error.message || 'Unknown error',
        requestPayload: payload,
        responseBody: null,
        timestamp: new Date().toISOString()
      };

      _emit('request-error', result);
      return result;
    }
  };

  /**
   * Executar batch de requisições com controle de concorrência
   */
  const executeBatch = async (profiles, config, onProgress) => {
    state.isRunning = true;
    state.totalRequests = profiles.length * config.requestsPerProfile;
    state.completedRequests = 0;
    state.successfulRequests = 0;
    state.failedRequests = 0;
    state.activeAbort = new AbortController();

    const results = [];
    const activeRequests = new Set();
    const maxConcurrency = Math.min(config.concurrency || 3, ConfigEngine.get('MAX_CONCURRENCY'));

    _emit('batch-start', { totalRequests: state.totalRequests });

    try {
      let requestIndex = 0;

      for (const profile of profiles) {
        for (let i = 0; i < config.requestsPerProfile; i++) {
          if (state.activeAbort.signal.aborted) {
            break;
          }

          // Ramp-up (opcional)
          if (config.rampUp && config.rampUp > 0 && requestIndex > 0) {
            const delayMs = (config.rampUp * 1000) / state.totalRequests;
            await UtilsEngine.sleep(delayMs);
          }

          // Aguardar disponibilidade de slot
          while (activeRequests.size >= maxConcurrency && !state.activeAbort.signal.aborted) {
            await Promise.race(activeRequests);
          }

          if (state.activeAbort.signal.aborted) {
            break;
          }

          // Gerar número de atendimento
          const attendanceNumber = UtilsEngine.generateAttendanceNumber(profile.codigo);

          // Preencher placeholders no payload
          let filledPayload = profile.payloadTemplate;
          filledPayload = filledPayload.replace(/{{NUM_ATENDIMENTO}}/g, attendanceNumber);
          filledPayload = filledPayload.replace(/{{LOGIN}}/g, profile.login || '');
          filledPayload = filledPayload.replace(/{{SENHA}}/g, profile.senha || '');
          filledPayload = filledPayload.replace(/{{CODIGO_APOIADO}}/g, profile.codigoApoiado || '');
          filledPayload = filledPayload.replace(/{{CODIGO_SENHA}}/g, profile.codigoSenha || '');

          // Executar requisição
          const promise = executeRequest(profile, attendanceNumber, filledPayload, config)
            .then(result => {
              results.push(result);
              if (typeof onProgress === 'function') {
                onProgress({
                  completed: state.completedRequests,
                  total: state.totalRequests,
                  successful: state.successfulRequests,
                  failed: state.failedRequests
                });
              }
            })
            .finally(() => activeRequests.delete(promise));

          activeRequests.add(promise);
          requestIndex++;
        }
      }

      // Aguardar todas as requisições
      await Promise.allSettled(activeRequests);

      _emit('batch-complete', { results, stats: state });
      return results;

    } catch (error) {
      console.error('[RunnerEngine] Erro durante batch:', error);
      _emit('batch-error', { error: error.message });
      return results;
    } finally {
      state.isRunning = false;
    }
  };

  /**
   * Cancelar execução em andamento
   */
  const abort = () => {
    if (state.activeAbort) {
      state.activeAbort.abort();
    }
    state.isRunning = false;
    _emit('batch-aborted', {});
  };

  /**
   * Obter status atual
   */
  const getStatus = () => ({
    isRunning: state.isRunning,
    currentSequence: state.currentSequence,
    totalRequests: state.totalRequests,
    completedRequests: state.completedRequests,
    successfulRequests: state.successfulRequests,
    failedRequests: state.failedRequests,
    successRate: state.totalRequests > 0
      ? ((state.successfulRequests / state.completedRequests) * 100).toFixed(1)
      : 0
  });

  return {
    executeRequest,
    executeBatch,
    abort,
    getStatus,
    on
  };
})();

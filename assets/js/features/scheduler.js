/**
 * ScheduleRunner — Executor de agendamentos
 * Roda em background checando schedules vencidos
 */
const ScheduleRunner = (() => {
  const state = {
    isRunning: false,
    checkInterval: 60000, // Checar a cada 60 segundos
    intervalHandle: null,
    listeners: []
  };

  /**
   * Registrar listener
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
          console.error(`[ScheduleRunner] Erro em listener ${eventType}:`, error);
        }
      });
  };

  /**
   * Iniciar monitor de agendamentos
   */
  const start = () => {
    if (state.isRunning) {
      console.warn('[ScheduleRunner] Já está rodando');
      return;
    }

    state.isRunning = true;
    _emit('runner-start', {});

    // Executar imediatamente ao iniciar para não esperar o próximo intervalo
    Promise.resolve(_checkAndExecuteDue()).catch(error => {
      console.error('[ScheduleRunner] Erro na primeira checagem de agendamentos:', error);
    });

    state.intervalHandle = setInterval(() => {
      Promise.resolve(_checkAndExecuteDue()).catch(error => {
        console.error('[ScheduleRunner] Erro ao checar agendamentos:', error);
      });
    }, state.checkInterval);

    console.log('[ScheduleRunner] Iniciado com intervalo de', state.checkInterval, 'ms');
  };

  /**
   * Parar monitor
   */
  const stop = () => {
    if (!state.isRunning) return;

    state.isRunning = false;
    if (state.intervalHandle) {
      clearInterval(state.intervalHandle);
      state.intervalHandle = null;
    }

    _emit('runner-stop', {});
    console.log('[ScheduleRunner] Parado');
  };

  /**
   * Checar e executar agendamentos vencidos
   */
  const _checkAndExecuteDue = async () => {
    const dueSchedules = SchedulerManager.getDue();

    if (dueSchedules.length === 0) {
      return;
    }

    console.log(`[ScheduleRunner] ${dueSchedules.length} agendamento(s) devido(s)`);

    for (const schedule of dueSchedules) {
      await _executeSchedule(schedule);
    }
  };

  /**
   * Executar um agendamento
   */
  const _executeSchedule = async (schedule) => {
    try {
      _emit('schedule-executing', { schedule });

      let results = [];

      if (schedule.cenarioId) {
        // Executar cenário
        results = await ScenarioExecutor.execute(schedule.cenarioId);
      } else {
        // Executar profiles individuais, mesclando o método SOAP
        const method = schedule.config.methodId ? MethodsManager.getById(schedule.config.methodId) : null;

        if (!method) {
          console.error('[ScheduleRunner] Agendamento sem methodId configurado:', schedule.id);
          SchedulerManager.recordExecution(schedule.id);
          _emit('schedule-error', { schedule, error: 'Método SOAP não configurado. Edite o agendamento e selecione um método.' });
          return;
        }

        const profiles = schedule.profileIds
          .map(id => {
            const profile = ProfilesManager.getById(id);
            if (!profile) return null;
            return {
              ...profile,
              payloadTemplate: method.payloadTemplate,
              xmlTag: method.xmlTag || profile.xmlTag,
              soapAction: method.soapAction || profile.soapAction
            };
          })
          .filter(p => p !== null);

        results = await RunnerEngine.executeBatch(profiles, schedule.config);
      }

      // Salvar resultados
      results.forEach(result => {
        ResultsManager.add({
          profileId: result.profileId,
          endpoint: result.profileName,
          version: 'v3',
          duration: result.duration,
          statusCode: result.statusCode,
          success: result.success,
          numAtendimentoDB: result.numDB,
          requestPayload: result.requestPayload,
          responseBody: result.responseBody,
          errorDetail: result.errorDetail,
          origem: 'scheduled',
          scheduleId: schedule.id,
          executadoPor: 'system'
        });
      });

      // Registrar execução
      SchedulerManager.recordExecution(schedule.id);

      _emit('schedule-executed', {
        schedule,
        results,
        successCount: results.filter(r => r.success).length,
        totalCount: results.length
      });

    } catch (error) {
      console.error('[ScheduleRunner] Erro ao executar agendamento:', error);
      _emit('schedule-error', {
        schedule,
        error: error.message
      });
    }
  };

  /**
   * Forçar execução de agendamento
   */
  const forceExecute = (scheduleId) => {
    const schedule = SchedulerManager.getById(scheduleId);
    if (!schedule) throw new Error('Agendamento não encontrado');
    
    return _executeSchedule(schedule);
  };

  /**
   * Obter status
   */
  const getStatus = () => ({
    isRunning: state.isRunning,
    checkInterval: state.checkInterval,
    nextCheck: state.isRunning ? 'em ' + state.checkInterval + 'ms' : 'parado'
  });

  return {
    start,
    stop,
    forceExecute,
    getStatus,
    on
  };
})();

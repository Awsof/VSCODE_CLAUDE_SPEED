/**
 * ResultsManager — Gestão do histórico de execuções e resultados
 * Chave: results
 * 
 * Schema do resultado:
 * {
 *   id: "uuid",
 *   seq: 1,                    // Sequência global de envio
 *   profileId: "uuid",
 *   endpoint: "endpoint-name",
 *   version: "1.0",
 *   duration: 250,             // ms
 *   statusCode: 200,
 *   success: true,
 *   numAtendimentoDB: "123456", // Sempre preenchido
 *   requestPayload: "<soap>...",
 *   responseBody: "<soap>...",
 *   errorDetail: null,
 *   origem: "manual",          // ou "scheduled"
 *   scheduleId: null,          // ID do agendamento se origem="scheduled"
 *   executadoPor: "usuario-id",
 *   executadoEm: "2026-05-07T10:00:00",
 *   cenarioId: null            // Se foi executado como parte de um cenário
 * }
 */

const ResultsManager = (() => {
  const STORE_KEY = 'results';
  const MAX_RESULTS = 5000; // Limite para evitar overflow

  /**
   * Gerar UUID v4 simples
   */
  const _generateUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  /**
   * Obter lista de resultados
   */
  const list = () => {
    return StorageEngine.get(STORE_KEY, []);
  };

  /**
   * Obter resultado por ID
   */
  const getById = (id) => {
    const results = list();
    return results.find(r => r.id === id) || null;
  };

  /**
   * Obter resultados de um perfil
   */
  const getByProfile = (profileId) => {
    const results = list();
    return results.filter(r => r.profileId === profileId);
  };

  /**
   * Obter resultados de um usuário
   */
  const getByUser = (userId) => {
    const results = list();
    return results.filter(r => r.executadoPor === userId);
  };

  /**
   * Obter resultados de um cenário
   */
  const getByCenario = (cenarioId) => {
    const results = list();
    return results.filter(r => r.cenarioId === cenarioId);
  };

  /**
   * Obter resultados agendados
   */
  const getScheduled = (scheduleId) => {
    const results = list();
    return results.filter(r => r.scheduleId === scheduleId);
  };

  /**
   * Obter resultados de um período
   */
  const getByDateRange = (startDate, endDate) => {
    const results = list();
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();

    return results.filter(r => {
      const time = new Date(r.executadoEm).getTime();
      return time >= start && time <= end;
    });
  };

  /**
   * Obter próxima sequência global
   */
  const getNextSeq = () => {
    const results = list();
    if (results.length === 0) return 1;
    const maxSeq = Math.max(...results.map(r => r.seq || 0));
    return maxSeq + 1;
  };

  /**
   * Adicionar resultado
   */
  const add = (resultData) => {
    const {
      profileId,
      endpoint,
      version,
      duration,
      statusCode,
      success,
      numAtendimentoDB,
      requestPayload,
      responseBody,
      errorDetail,
      origem,
      scheduleId,
      executadoPor,
      cenarioId
    } = resultData;

    // Validações
    if (!profileId || !executadoPor) {
      console.error('[ResultsManager] profileId e executadoPor obrigatórios');
      return null;
    }

    try {
      const results = list();

      // Limpar resultados antigos se exceder MAX_RESULTS
      let cleanedResults = results;
      if (cleanedResults.length >= MAX_RESULTS) {
        // Remover resultados mais antigos (10% do total)
        const toRemove = Math.floor(MAX_RESULTS * 0.1);
        cleanedResults = cleanedResults
          .sort((a, b) => new Date(b.executadoEm) - new Date(a.executadoEm))
          .slice(0, MAX_RESULTS - toRemove);
      }

      const newResult = {
        id: _generateUUID(),
        seq: getNextSeq(),
        profileId,
        endpoint: endpoint || 'unknown',
        version: version || '1.0',
        duration: duration || 0,
        statusCode: statusCode || null,
        success: success === true,
        numAtendimentoDB: numAtendimentoDB || null,
        requestPayload: requestPayload || null,
        responseBody: responseBody || null,
        errorDetail: errorDetail || null,
        origem: origem || 'manual',
        scheduleId: scheduleId || null,
        executadoPor,
        executadoEm: resultData.executadoEm || new Date().toISOString(),
        cenarioId: cenarioId || null
      };

      cleanedResults.push(newResult);
      StorageEngine.set(STORE_KEY, cleanedResults);

      return newResult;
    } catch (error) {
      console.error('[ResultsManager] Erro ao adicionar resultado:', error);
      return null;
    }
  };

  /**
   * Adicionar vários resultados (batch)
   */
  const addBatch = (resultsData) => {
    const added = [];
    for (let data of resultsData) {
      const result = add(data);
      if (result) added.push(result);
    }
    return added;
  };

  /**
   * Obter estatísticas gerais
   */
  const getStats = () => {
    const results = list();
    const total = results.length;
    const successful = results.filter(r => r.success).length;
    const failed = total - successful;
    const avgDuration = total > 0
      ? Math.round(results.reduce((sum, r) => sum + (r.duration || 0), 0) / total)
      : 0;

    const byStatus = {};
    results.forEach(r => {
      const status = r.statusCode || 'unknown';
      byStatus[status] = (byStatus[status] || 0) + 1;
    });

    return {
      total,
      successful,
      failed,
      successRate: total > 0 ? ((successful / total) * 100).toFixed(2) + '%' : 'N/A',
      avgDuration,
      byStatus
    };
  };

  /**
   * Obter estatísticas por perfil
   */
  const getStatsByProfile = (profileId) => {
    const results = getByProfile(profileId);
    const total = results.length;
    const successful = results.filter(r => r.success).length;
    const failed = total - successful;
    const avgDuration = total > 0
      ? Math.round(results.reduce((sum, r) => sum + (r.duration || 0), 0) / total)
      : 0;

    return {
      profileId,
      total,
      successful,
      failed,
      successRate: total > 0 ? ((successful / total) * 100).toFixed(2) + '%' : 'N/A',
      avgDuration
    };
  };

  /**
   * Limpar resultados antigos (> N dias)
   */
  const clearOlder = (days) => {
    try {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      const cutoffTime = cutoff.getTime();

      const results = list();
      const filtered = results.filter(r => {
        const time = new Date(r.executadoEm).getTime();
        return time > cutoffTime;
      });

      StorageEngine.set(STORE_KEY, filtered);
      return results.length - filtered.length; // Quantidade removida
    } catch (error) {
      console.error('[ResultsManager] Erro ao limpar:', error);
      return 0;
    }
  };

  /**
   * Exportar resultados como JSON
   */
  const exportJSON = () => {
    return JSON.stringify(list(), null, 2);
  };

  /**
   * Limpar todos os resultados
   */
  const clear = () => {
    try {
      StorageEngine.remove(STORE_KEY);
      return true;
    } catch (error) {
      console.error('[ResultsManager] Erro ao limpar:', error);
      return false;
    }
  };

  /**
   * Contar resultados
   */
  const count = () => {
    return list().length;
  };

  return {
    list,
    getById,
    getByProfile,
    getByUser,
    getByCenario,
    getScheduled,
    getByDateRange,
    getNextSeq,
    add,
    addBatch,
    getStats,
    getStatsByProfile,
    clearOlder,
    exportJSON,
    clear,
    count
  };
})();

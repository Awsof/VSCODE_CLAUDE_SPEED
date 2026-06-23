/**
 * ResultsManager — Gestão do histórico de execuções e resultados
 * Backend: IndexedDB (stp_results_v1) com cache em memória para leituras síncronas.
 *
 * Schema do resultado:
 * {
 *   id: "uuid",
 *   seq: 1,
 *   profileId: "uuid",
 *   endpoint: "endpoint-name",
 *   version: "1.0",
 *   duration: 250,
 *   statusCode: 200,
 *   success: true,
 *   numAtendimentoDB: "123456",
 *   requestPayload: "<soap>...",
 *   responseBody: "<soap>...",
 *   errorDetail: null,
 *   origem: "manual",
 *   scheduleId: null,
 *   executadoPor: "usuario-id",
 *   executadoEm: "2026-05-07T10:00:00",
 *   cenarioId: null
 * }
 */

const ResultsManager = (() => {
  const DB_NAME    = 'stp_results_v1';
  const STORE_NAME = 'results';
  const MAX_RESULTS = 10000;

  let _db    = null;
  let _cache = []; // ordenado cronologicamente (mais antigo primeiro)

  // ─── IndexedDB helpers ────────────────────────────────────────────────────

  const _openDB = () => new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('by_seq', 'seq', { unique: false });
      }
    };
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror   = (e) => reject(e.target.error);
  });

  const _loadAllFromIDB = () => new Promise((resolve, reject) => {
    const req = _db.transaction(STORE_NAME, 'readonly')
                   .objectStore(STORE_NAME).getAll();
    req.onsuccess = (e) => resolve(
      (e.target.result || []).sort((a, b) => new Date(a.executadoEm) - new Date(b.executadoEm))
    );
    req.onerror = (e) => reject(e.target.error);
  });

  // Migração única: move dados do localStorage para IDB e remove a chave antiga
  const _migrateFromLocalStorage = async () => {
    const raw = localStorage.getItem('stp_v3_results');
    if (!raw) return;
    try {
      const old = JSON.parse(raw);
      if (Array.isArray(old) && old.length > 0) {
        const tx    = _db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        old.forEach(r => store.put(r));
        await new Promise((res, rej) => { tx.oncomplete = res; tx.onerror = rej; });
        console.log(`[ResultsManager] Migração: ${old.length} resultado(s) movidos para IndexedDB`);
      }
    } catch (e) {
      console.warn('[ResultsManager] Erro na migração do localStorage:', e);
    } finally {
      localStorage.removeItem('stp_v3_results');
    }
  };

  const _idbPut = (record) => {
    if (!_db) return;
    _db.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).put(record);
  };

  const _idbDeleteMany = (ids) => {
    if (!_db || !ids.length) return;
    const tx    = _db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    ids.forEach(id => store.delete(id));
  };

  // ─── UUID v4 ─────────────────────────────────────────────────────────────

  const _generateUUID = () =>
    'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });

  // ─── API pública ──────────────────────────────────────────────────────────

  /**
   * Inicializar: abre IDB, migra localStorage (uma vez), carrega cache.
   * Deve ser chamado com await antes de renderizar o app.
   */
  const init = async () => {
    try {
      _db    = await _openDB();
      await _migrateFromLocalStorage();
      _cache = await _loadAllFromIDB();
      console.log(`[ResultsManager] Iniciado — ${_cache.length} resultado(s) no IndexedDB`);
    } catch (error) {
      console.error('[ResultsManager] Falha ao inicializar IndexedDB, operando sem persistência:', error);
      _db    = null;
      _cache = [];
    }
  };

  /** Retorna todos os resultados (cópia do cache, mais antigos primeiro) */
  const list = () => [..._cache];

  const getById = (id) => _cache.find(r => r.id === id) || null;

  const getByProfile = (profileId) => _cache.filter(r => r.profileId === profileId);

  const getByUser = (userId) => _cache.filter(r => r.executadoPor === userId);

  const getByCenario = (cenarioId) => _cache.filter(r => r.cenarioId === cenarioId);

  const getScheduled = (scheduleId) => _cache.filter(r => r.scheduleId === scheduleId);

  const getByDateRange = (startDate, endDate) => {
    const start = new Date(startDate).getTime();
    const end   = new Date(endDate).getTime();
    return _cache.filter(r => {
      const t = new Date(r.executadoEm).getTime();
      return t >= start && t <= end;
    });
  };

  const getNextSeq = () => {
    if (_cache.length === 0) return 1;
    return Math.max(..._cache.map(r => r.seq || 0)) + 1;
  };

  /**
   * Adicionar resultado (síncrono: atualiza cache imediatamente, persiste IDB em background).
   */
  const add = (resultData) => {
    const {
      profileId, endpoint, version, duration, statusCode, success,
      numAtendimentoDB, requestPayload, responseBody, errorDetail,
      origem, scheduleId, executadoPor, cenarioId
    } = resultData;

    if (!profileId || !executadoPor) {
      console.error('[ResultsManager] profileId e executadoPor são obrigatórios');
      return null;
    }

    try {
      // Limpar mais antigos se exceder limite
      if (_cache.length >= MAX_RESULTS) {
        const toRemove = _cache.splice(0, Math.floor(MAX_RESULTS * 0.1));
        _idbDeleteMany(toRemove.map(r => r.id));
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

      _cache.push(newResult);
      _idbPut(newResult);
      _syncToTurso(newResult);

      return newResult;
    } catch (error) {
      console.error('[ResultsManager] Erro ao adicionar resultado:', error);
      return null;
    }
  };

  const addBatch = (resultsData) => {
    const added = [];
    for (const data of resultsData) {
      const result = add(data);
      if (result) added.push(result);
    }
    return added;
  };

  const getStats = () => {
    const total      = _cache.length;
    const successful = _cache.filter(r => r.success).length;
    const failed     = total - successful;
    const avgDuration = total > 0
      ? Math.round(_cache.reduce((sum, r) => sum + (r.duration || 0), 0) / total)
      : 0;

    const byStatus = {};
    _cache.forEach(r => {
      const s = r.statusCode || 'unknown';
      byStatus[s] = (byStatus[s] || 0) + 1;
    });

    return {
      total, successful, failed,
      successRate: total > 0 ? ((successful / total) * 100).toFixed(2) + '%' : 'N/A',
      avgDuration, byStatus
    };
  };

  const getStatsByProfile = (profileId) => {
    const results     = getByProfile(profileId);
    const total       = results.length;
    const successful  = results.filter(r => r.success).length;
    const failed      = total - successful;
    const avgDuration = total > 0
      ? Math.round(results.reduce((sum, r) => sum + (r.duration || 0), 0) / total)
      : 0;
    return {
      profileId, total, successful, failed,
      successRate: total > 0 ? ((successful / total) * 100).toFixed(2) + '%' : 'N/A',
      avgDuration
    };
  };

  const clearOlder = async (days) => {
    try {
      const cutoff   = Date.now() - days * 86400000;
      const toRemove = _cache.filter(r => new Date(r.executadoEm).getTime() <= cutoff);
      _cache         = _cache.filter(r => new Date(r.executadoEm).getTime() > cutoff);
      _idbDeleteMany(toRemove.map(r => r.id));
      return toRemove.length;
    } catch (error) {
      console.error('[ResultsManager] Erro ao limpar antigos:', error);
      return 0;
    }
  };

  const exportJSON = () => JSON.stringify(_cache, null, 2);

  /** Limpar todos os resultados (async — aguarda limpeza no IDB) */
  const clear = async () => {
    _cache = [];
    if (!_db) return true;
    return new Promise((resolve) => {
      const req = _db.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).clear();
      req.onsuccess = () => resolve(true);
      req.onerror   = () => resolve(false);
    });
  };


  /**
   * Sincronizar resultados do Turso para o cache local (fire-and-forget opcional).
   * Chamado pelo app.js após login bem-sucedido.
   */
  const syncFromTurso = async () => {
    try {
      const token = typeof SessionManager !== 'undefined' ? SessionManager.getToken?.() : null;
      if (!token) return;

      const res = await fetch('/api/results', { headers: { 'Authorization': 'Bearer ' + token } });
      if (!res.ok) return;

      const data = await res.json();
      const tursoResults = data.results || [];
      if (!tursoResults.length) return;

      const localIds = new Set(_cache.map(r => r.id));
      const newResults = tursoResults.filter(r => !localIds.has(r.id));
      if (!newResults.length) return;

      _cache = [..._cache, ...newResults]
        .sort((a, b) => new Date(a.executadoEm) - new Date(b.executadoEm));

      if (_db) {
        const tx = _db.transaction('results', 'readwrite');
        const store = tx.objectStore('results');
        newResults.forEach(r => store.put(r));
      }

      console.log('[ResultsManager] ' + newResults.length + ' resultado(s) sincronizado(s) do Turso');
    } catch (e) {
      console.warn('[ResultsManager] Sync do Turso falhou (modo offline):', e.message);
    }
  };

  /** Enviar resultado para o Turso em background (fire-and-forget) */
  const _syncToTurso = (result) => {
    try {
      const token = typeof SessionManager !== 'undefined' ? SessionManager.getToken?.() : null;
      if (!token) return;
      fetch('/api/results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify(result)
      }).catch(e => console.warn('[ResultsManager] Falha ao sincronizar resultado:', e.message));
    } catch (e) {
      console.warn('[ResultsManager] _syncToTurso error:', e.message);
    }
  };
  const count = () => _cache.length;

  return {
    init,
    syncFromTurso,
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


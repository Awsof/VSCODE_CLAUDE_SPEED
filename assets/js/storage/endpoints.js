/**
 * EndpointsManager — Catálogo de endpoints SOAP reutilizáveis
 *
 * Schema:
 * {
 *   id: "uuid",
 *   nome: "Produção MB",
 *   url: "https://wsmb.diagnosticosdobrasil.com.br/...",
 *   descricao: "",
 *   criadoPor: "admin",
 *   criadoEm: "2026-06-25T10:00:00"
 * }
 */

const EndpointsManager = (() => {
  const STORE_KEY = 'stp_v3_endpoints';

  const _token = () =>
    typeof SessionManager !== 'undefined' ? SessionManager.getToken?.() : null;

  const _apiSync = (method, path, body) => {
    try {
      const token = _token();
      const opts = { method, headers: { 'Content-Type': 'application/json' } };
      if (token) opts.headers['Authorization'] = 'Bearer ' + token;
      if (body) opts.body = JSON.stringify(body);
      fetch(path, opts).catch(e => console.warn('[EndpointsManager] API sync falhou:', e.message));
    } catch (e) {
      console.warn('[EndpointsManager] _apiSync error:', e.message);
    }
  };

  const syncFromTurso = async () => {
    try {
      const token = _token();
      if (!token) return false;
      const res = await fetch('/api/endpoints', {
        headers: { 'Authorization': 'Bearer ' + token }
      });
      if (!res.ok) return false;
      const data = await res.json();
      const remote = data.endpoints || [];
      const local = StorageEngine.get(STORE_KEY, []);

      // Auto-migração: Turso vazio mas localStorage tem dados
      if (remote.length === 0 && local.length > 0) {
        const postHeaders = { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token };
        console.log('[EndpointsManager] Turso vazio — migrando ' + local.length + ' endpoint(s)...');
        for (const ep of local) {
          try {
            await fetch('/api/endpoints', { method: 'POST', headers: postHeaders, body: JSON.stringify(ep) });
          } catch {}
        }
        console.log('[EndpointsManager] Migração concluída');
        return false;
      }

      const remoteIds = remote.map(e => e.id).sort().join();
      const localIds  = local.map(e => e.id).sort().join();
      if (remoteIds === localIds && remote.length === local.length) return false;

      StorageEngine.set(STORE_KEY, remote);
      console.log('[EndpointsManager] ' + remote.length + ' endpoint(s) sincronizados do Turso');
      return true;
    } catch (e) {
      console.warn('[EndpointsManager] syncFromTurso falhou:', e.message);
      return false;
    }
  };

  const _generateUUID = () =>
    'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });

  const list = () => StorageEngine.get(STORE_KEY, []);

  const getById = (id) => list().find(e => e.id === id) || null;

  const create = (data) => {
    const { nome, url, descricao, criadoPor } = data;
    if (!nome || !url || !criadoPor) {
      console.error('[EndpointsManager] Campos obrigatórios faltando');
      return null;
    }
    const endpoints = list();
    try {
      const newEndpoint = {
        id: _generateUUID(),
        nome: nome.trim(),
        url: url.trim(),
        descricao: (descricao || '').trim(),
        criadoPor,
        criadoEm: new Date().toISOString()
      };
      endpoints.push(newEndpoint);
      StorageEngine.set(STORE_KEY, endpoints);
      _apiSync('POST', '/api/endpoints', newEndpoint);
      return newEndpoint;
    } catch (error) {
      console.error('[EndpointsManager] Erro ao criar:', error);
      return null;
    }
  };

  const update = (id, updates) => {
    try {
      const endpoints = list();
      const index = endpoints.findIndex(e => e.id === id);
      if (index === -1) {
        console.error('[EndpointsManager] Endpoint não encontrado:', id);
        return null;
      }
      const updated = { ...endpoints[index], ...updates };
      if (updates.nome) updated.nome = updates.nome.trim();
      if (updates.url)  updated.url  = updates.url.trim();
      endpoints[index] = updated;
      StorageEngine.set(STORE_KEY, endpoints);
      _apiSync('PUT', '/api/endpoints?id=' + id, updates);
      return updated;
    } catch (error) {
      console.error('[EndpointsManager] Erro ao atualizar:', error);
      return null;
    }
  };

  const delete_ = (id) => {
    try {
      const endpoints = list();
      const filtered = endpoints.filter(e => e.id !== id);
      if (filtered.length === endpoints.length) {
        console.error('[EndpointsManager] Endpoint não encontrado:', id);
        return false;
      }
      StorageEngine.set(STORE_KEY, filtered);
      _apiSync('DELETE', '/api/endpoints?id=' + id);
      return true;
    } catch (error) {
      console.error('[EndpointsManager] Erro ao deletar:', error);
      return false;
    }
  };

  const count = () => list().length;

  return { list, getById, create, update, delete_, count, syncFromTurso };
})();

window.EndpointsManager = EndpointsManager;

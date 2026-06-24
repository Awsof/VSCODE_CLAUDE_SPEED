/**
 * MethodsManager — Gestão de métodos SOAP (operações do webservice)
 *
 * Schema:
 * {
 *   id: "uuid",
 *   nome: "RecebeAtendimento",
 *   operacao: "RecebeAtendimento",
 *   soapAction: "http://tempuri.org/wsrvProtocoloDBSync/RecebeAtendimento",
 *   payloadTemplate: "<soap:Envelope>...</soap:Envelope>",
 *   xmlTag: "diag:NumeroAtendimentoApoiado",
 *   descricao: "",
 *   criadoPor: "admin",
 *   criadoEm: "2026-05-12T10:00:00"
 * }
 */

const MethodsManager = (() => {
  const STORE_KEY = 'soap_methods';

  const _token = () =>
    typeof SessionManager !== 'undefined' ? SessionManager.getToken?.() : null;

  const _apiSync = (method, path, body) => {
    try {
      const token = _token();
      const opts = { method, headers: { 'Content-Type': 'application/json' } };
      if (token) opts.headers['Authorization'] = 'Bearer ' + token;
      if (body) opts.body = JSON.stringify(body);
      fetch(path, opts).catch(e => console.warn('[MethodsManager] API sync falhou:', e.message));
    } catch (e) {
      console.warn('[MethodsManager] _apiSync error:', e.message);
    }
  };

  const syncFromTurso = async () => {
    try {
      const token = _token();
      // GET é público — funciona sem JWT; POST de migração requer JWT
      const getHeaders = token ? { 'Authorization': 'Bearer ' + token } : {};
      const res = await fetch('/api/methods', { headers: getHeaders });
      if (!res.ok) return false;
      const data = await res.json();
      const remoteMethods = data.methods || [];
      const local = StorageEngine.get(STORE_KEY, []);

      // Auto-migração: Turso vazio mas localStorage tem dados (requer JWT)
      if (remoteMethods.length === 0 && local.length > 0 && token) {
        const postHeaders = { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token };
        console.log('[MethodsManager] Turso vazio — migrando ' + local.length + ' método(s)...');
        for (const m of local) {
          try {
            await fetch('/api/methods', { method: 'POST', headers: postHeaders, body: JSON.stringify(m) });
          } catch {}
        }
        console.log('[MethodsManager] Migração concluída');
        return false;
      }

      const remoteIds = remoteMethods.map(m => m.id).sort().join();
      const localIds  = local.map(m => m.id).sort().join();
      if (remoteIds === localIds && remoteMethods.length === local.length) return false;

      StorageEngine.set(STORE_KEY, remoteMethods);
      console.log('[MethodsManager] ' + remoteMethods.length + ' método(s) sincronizados do Turso');
      return true;
    } catch (e) {
      console.warn('[MethodsManager] syncFromTurso falhou:', e.message);
      return false;
    }
  };

  const _generateUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  const list = () => StorageEngine.get(STORE_KEY, []);

  const getById = (id) => list().find(m => m.id === id) || null;

  const create = (data) => {
    const { nome, operacao, soapAction, payloadTemplate, xmlTag, descricao, criadoPor } = data;
    if (!nome || !soapAction || !payloadTemplate || !criadoPor) {
      console.error('[MethodsManager] Campos obrigatórios faltando');
      return null;
    }
    const methods = list();
    try {
      const newMethod = {
        id: _generateUUID(),
        nome: nome.trim(),
        operacao: (operacao || nome).trim(),
        soapAction: soapAction.trim(),
        payloadTemplate: payloadTemplate.trim(),
        xmlTag: (xmlTag || 'diag:NumeroAtendimentoApoiado').trim(),
        descricao: (descricao || '').trim(),
        criadoPor,
        criadoEm: new Date().toISOString()
      };
      methods.push(newMethod);
      StorageEngine.set(STORE_KEY, methods);
      _apiSync('POST', '/api/methods', newMethod);
      return newMethod;
    } catch (error) {
      console.error('[MethodsManager] Erro ao criar:', error);
      return null;
    }
  };

  const update = (id, updates) => {
    try {
      const methods = list();
      const index = methods.findIndex(m => m.id === id);
      if (index === -1) {
        console.error('[MethodsManager] Método não encontrado:', id);
        return null;
      }
      const updated = { ...methods[index], ...updates };
      if (updates.soapAction) updated.soapAction = updates.soapAction.trim();
      if (updates.payloadTemplate) updated.payloadTemplate = updates.payloadTemplate.trim();
      methods[index] = updated;
      StorageEngine.set(STORE_KEY, methods);
      _apiSync('PUT', '/api/methods?id=' + id, updates);
      return updated;
    } catch (error) {
      console.error('[MethodsManager] Erro ao atualizar:', error);
      return null;
    }
  };

  const delete_ = (id) => {
    try {
      const methods = list();
      const filtered = methods.filter(m => m.id !== id);
      if (filtered.length === methods.length) {
        console.error('[MethodsManager] Método não encontrado:', id);
        return false;
      }
      StorageEngine.set(STORE_KEY, filtered);
      _apiSync('DELETE', '/api/methods?id=' + id);
      return true;
    } catch (error) {
      console.error('[MethodsManager] Erro ao deletar:', error);
      return false;
    }
  };

  const count = () => list().length;

  return { list, getById, create, update, delete_, count, syncFromTurso };
})();

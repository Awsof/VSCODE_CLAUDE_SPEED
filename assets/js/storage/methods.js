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
      return true;
    } catch (error) {
      console.error('[MethodsManager] Erro ao deletar:', error);
      return false;
    }
  };

  const count = () => list().length;

  return { list, getById, create, update, delete_, count };
})();

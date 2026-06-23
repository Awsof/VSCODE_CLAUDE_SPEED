/**
 * AuditLogManager — Registro de atividades e auditoria
 * Armazena até 1000 eventos (FIFO): criações, edições, exclusões, execuções
 */
const AuditLogManager = (() => {
  const KEY = 'stp_audit_log';
  const MAX = 1000;

  const _load = () => {
    try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; }
  };

  const _save = (entries) => {
    localStorage.setItem(KEY, JSON.stringify(entries));
  };

  const _genId = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
    return Date.now().toString(36) + Math.random().toString(36).slice(2);
  };

  /**
   * Registrar um evento de auditoria
   * @param {string} tipo - Ex: 'teste:criar', 'metodo:editar', 'agendamento:excluir', 'teste:executar'
   * @param {string} targetNome - Nome legível do alvo (ex: nome do perfil)
   * @param {string|null} detalhes - Informações adicionais (ex: "50 req, 5 conc")
   */
  const record = (tipo, targetNome, detalhes = null) => {
    try {
      const u = (typeof SessionManager !== 'undefined') ? SessionManager.getCurrentUser() : null;
      const entries = _load();
      entries.push({
        id: _genId(),
        tipo,
        targetNome: targetNome || '—',
        detalhes,
        userId:    u?.id       || 'desconhecido',
        usuario:   u?.usuario  || 'desconhecido',
        timestamp: new Date().toISOString()
      });
      if (entries.length > MAX) entries.splice(0, entries.length - MAX);
      _save(entries);
    } catch (error) {
      // silencioso — não interromper fluxo principal
    }
  };

  /**
   * Listar todos os eventos (mais recente primeiro)
   */
  const list = () => _load().slice().reverse();

  /**
   * Limpar todos os registros
   */
  const clear = () => _save([]);

  /**
   * Total de eventos registrados
   */
  const count = () => _load().length;

  return { record, list, clear, count };
})();

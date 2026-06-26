/**
 * RoleConfigManager — Configuração dinâmica de permissões por nível
 *
 * Permite ao admin ajustar em runtime quais permissões e limites cada papel
 * (operador, visualizador) possui. Admin sempre tem permissão total.
 *
 * Persistência: localStorage como cache + Turso como fonte de verdade.
 * Chave de Turso: 'role_config'
 * Chave localStorage: 'stp_v3_role_config'
 */
const RoleConfigManager = (() => {
  const LS_KEY   = 'stp_v3_role_config';
  const TURSO_KEY = 'role_config';

  const EDITABLE_ROLES = ['operador', 'visualizador'];

  // Defaults usados quando não há override salvo
  const DEFAULT_LIMITS = {
    operador:     { maxRequests: 50,  maxConcurrency: 50,  maxSchedules: 20 },
    visualizador: { maxRequests: 10,  maxConcurrency: 10,  maxSchedules: 0  },
  };

  let _config = { operador: {}, visualizador: {} };

  const _load = () => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) _config = JSON.parse(raw);
    } catch { _config = { operador: {}, visualizador: {} }; }
  };

  const _save = () => {
    try { localStorage.setItem(LS_KEY, JSON.stringify(_config)); } catch {}
  };

  const _ensureRole = (nivel) => {
    if (!_config[nivel]) _config[nivel] = {};
    if (!_config[nivel].permissions) _config[nivel].permissions = {};
    if (!_config[nivel].limits) _config[nivel].limits = {};
  };

  // ─── Leitura ───────────────────────────────────────────────────────────────

  /**
   * Retorna override de permissão ou null se não houver.
   * null = sem override, usar default do rbac.js.
   */
  const getPermission = (nivel, key) => {
    if (!EDITABLE_ROLES.includes(nivel)) return null;
    const p = (_config[nivel] || {}).permissions || {};
    return Object.prototype.hasOwnProperty.call(p, key) ? p[key] : null;
  };

  /**
   * Retorna limites customizados ou null se não houver (usar defaults).
   */
  const getLimits = (nivel) => {
    if (!EDITABLE_ROLES.includes(nivel)) return null;
    const l = (_config[nivel] || {}).limits || {};
    if (!Object.keys(l).length) return null;
    return { ...DEFAULT_LIMITS[nivel], ...l };
  };

  // ─── Escrita ───────────────────────────────────────────────────────────────

  const setPermission = (nivel, key, value) => {
    if (!EDITABLE_ROLES.includes(nivel)) return;
    _ensureRole(nivel);
    _config[nivel].permissions[key] = value;
    _save();
    _syncToTurso();
  };

  const setLimits = (nivel, limits) => {
    if (!EDITABLE_ROLES.includes(nivel)) return;
    _ensureRole(nivel);
    _config[nivel].limits = { ...(_config[nivel].limits || {}), ...limits };
    _save();
    _syncToTurso();
  };

  /**
   * Salva config completa de um nível de uma vez (usado pela UI ao salvar tudo).
   */
  const saveRoleConfig = (nivel, permissions, limits) => {
    if (!EDITABLE_ROLES.includes(nivel)) return;
    _ensureRole(nivel);
    _config[nivel].permissions = { ...permissions };
    _config[nivel].limits      = { ...limits };
    _save();
    _syncToTurso();
  };

  const reset = (nivel) => {
    if (!EDITABLE_ROLES.includes(nivel)) return;
    _config[nivel] = { permissions: {}, limits: {} };
    _save();
    _syncToTurso();
  };

  const resetAll = () => {
    _config = { operador: { permissions: {}, limits: {} }, visualizador: { permissions: {}, limits: {} } };
    _save();
    _syncToTurso();
  };

  // ─── Sync Turso ───────────────────────────────────────────────────────────

  const syncFromTurso = async () => {
    try {
      const token = window.SessionManager ? SessionManager.getToken() : null;
      if (!token) return;
      const res = await fetch(`/api/app-settings?key=${TURSO_KEY}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) return;
      const data = await res.json();
      if (!data.value) return;
      const remote = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
      // Merge: remote tem precedência sobre localStorage
      for (const role of EDITABLE_ROLES) {
        if (remote[role]) {
          _config[role] = {
            permissions: { ...(remote[role].permissions || {}) },
            limits:      { ...(remote[role].limits      || {}) },
          };
        }
      }
      _save();
    } catch { /* silencioso — sem Turso, usa localStorage */ }
  };

  const _syncToTurso = async () => {
    try {
      const token = window.SessionManager ? SessionManager.getToken() : null;
      if (!token) return;
      await fetch(`/api/app-settings?key=${TURSO_KEY}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ value: JSON.stringify(_config) })
      });
    } catch { /* sem Turso, config persiste só no localStorage */ }
  };

  // ─── Utilitários ──────────────────────────────────────────────────────────

  const getDefaultLimits = (nivel) => DEFAULT_LIMITS[nivel] || { maxRequests: 1, maxConcurrency: 1, maxSchedules: 0 };
  const getEditableRoles = () => [...EDITABLE_ROLES];
  const getRoleConfig     = (nivel) => ({
    permissions: { ...((_config[nivel] || {}).permissions || {}) },
    limits:      { ...((_config[nivel] || {}).limits      || {}) },
  });

  // Inicializa lendo localStorage
  _load();

  return {
    getPermission,
    getLimits,
    setPermission,
    setLimits,
    saveRoleConfig,
    reset,
    resetAll,
    syncFromTurso,
    getDefaultLimits,
    getEditableRoles,
    getRoleConfig,
  };
})();

/**
 * SessionManager — Gestão de sessão e autenticação
 * Armazenamento: sessionStorage (volátil, apenas para sessão ativa)
 * 
 * Schema da sessão:
 * {
 *   userId: "uuid",
 *   usuario: "joao.silva",
 *   nivel: "admin|operador|visualizador",
 *   loginAt: "2026-05-07T10:00:00",
 *   token: "jwt_like_string" (opcional)
 * }
 */

const SessionManager = (() => {
  const SESSION_KEY = 'stp_session';
  const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutos de inatividade

  /**
   * Obter dados da sessão ativa
   * Retorna null se não há sessão ou se expirou
   */
  const getSession = () => {
    try {
      const sessionData = sessionStorage.getItem(SESSION_KEY);
      if (!sessionData) return null;

      const session = JSON.parse(sessionData);

      // Verificar timeout por inatividade (lastActivity ou loginAt)
      const lastActive = new Date(session.lastActivity || session.loginAt).getTime();
      const elapsed = Date.now() - lastActive;

      // Não expirar sessão enquanto houver agendamentos ativos
      const hasActiveSchedules = typeof SchedulerManager !== 'undefined'
        && SchedulerManager.list().some(s => s.ativo);

      if (!hasActiveSchedules && elapsed > SESSION_TIMEOUT) {
        console.warn('[SessionManager] Sessão expirada por inatividade');
        logout();
        return null;
      }

      return session;
    } catch (error) {
      console.error('[SessionManager] Erro ao obter sessão:', error);
      return null;
    }
  };

  /**
   * Obter usuário atual
   * Retorna {id, usuario, nivel} ou null
   */
  const getCurrentUser = () => {
    const session = getSession();
    if (!session) return null;
    return {
      id: session.userId,
      usuario: session.usuario,
      nivel: session.nivel,
      senhaTemporaria: session.senhaTemporaria || false
    };
  };

  const clearSenhaTemporaria = () => {
    try {
      const sessionData = sessionStorage.getItem(SESSION_KEY);
      if (!sessionData) return;
      const session = JSON.parse(sessionData);
      session.senhaTemporaria = false;
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } catch {}
  };

  /**
   * Obter nível do usuário atual
   * Retorna "admin", "operador", "visualizador", ou null
   */
  const getCurrentLevel = () => {
    const session = getSession();
    return session ? session.nivel : null;
  };

  /**
   * Verificar se há sessão ativa
   */
  const isAuthenticated = () => {
    return getSession() !== null;
  };

  /**
   * Fazer login
   * @param {Object} user - Objeto do usuário (do UsersManager.validate)
   * @returns {boolean} - Sucesso
   */
  const login = (user, jwtToken = null) => {
    try {
      if (!user || !user.id || !user.usuario || !user.nivel) {
        console.error('[SessionManager] Dados de usuário inválidos');
        return false;
      }

      const now = new Date().toISOString();
      const session = {
        userId: user.id,
        usuario: user.usuario,
        nivel: user.nivel,
        senhaTemporaria: user.senhaTemporaria || false,
        loginAt: now,
        lastActivity: now,
        token: jwtToken || null
      };

      sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
      console.log(`[SessionManager] Login bem-sucedido para: ${user.usuario} (${user.nivel})`);
      
      // Disparar evento customizado
      window.dispatchEvent(new CustomEvent('session:login', { detail: user }));
      
      return true;
    } catch (error) {
      console.error('[SessionManager] Erro ao fazer login:', error);
      return false;
    }
  };

  /**
   * Fazer logout
   */
  const logout = () => {
    try {
      sessionStorage.removeItem(SESSION_KEY);
      console.log('[SessionManager] Logout realizado');
      
      // Disparar evento customizado
      window.dispatchEvent(new CustomEvent('session:logout'));
      
      return true;
    } catch (error) {
      console.error('[SessionManager] Erro ao fazer logout:', error);
      return false;
    }
  };

  /**
   * Renovar token da sessão (refresh) — preserva o JWT existente
   */
  const refresh = () => {
    const session = getSession();
    if (!session) return false;

    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
      return true;
    } catch (error) {
      console.error('[SessionManager] Erro ao renovar sessão:', error);
      return false;
    }
  };

  /**
   * Registrar atividade do usuário (renova o timer de inatividade)
   */
  const updateActivity = () => {
    try {
      const sessionData = sessionStorage.getItem(SESSION_KEY);
      if (!sessionData) return;
      const session = JSON.parse(sessionData);
      session.lastActivity = new Date().toISOString();
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } catch (error) {
      // silencioso — não bloquear interação do usuário
    }
  };

  /**
   * Verificar se a sessão está próxima do timeout
   * @param {number} warningMinutes - Minutos antes do timeout para avisar
   * @returns {boolean}
   */
  const isNearTimeout = (warningMinutes = 5) => {
    const session = getSession();
    if (!session) return false;

    const lastActive = new Date(session.lastActivity || session.loginAt).getTime();
    const elapsed = Date.now() - lastActive;
    const warningThreshold = SESSION_TIMEOUT - (warningMinutes * 60 * 1000);

    return elapsed > warningThreshold;
  };

  /**
   * Obter tempo restante da sessão em minutos (baseado em inatividade)
   */
  const getTimeRemaining = () => {
    try {
      const sessionData = sessionStorage.getItem(SESSION_KEY);
      if (!sessionData) return 0;
      const session = JSON.parse(sessionData);
      const lastActive = new Date(session.lastActivity || session.loginAt).getTime();
      const elapsed = Date.now() - lastActive;
      const remaining = Math.max(0, SESSION_TIMEOUT - elapsed);
      return Math.floor(remaining / 60000);
    } catch {
      return 0;
    }
  };

  /**
   * Obter informações da sessão para debug
   */
  const getDebugInfo = () => {
    const session = getSession();
    if (!session) return { active: false };
    return {
      active: true,
      userId: session.userId,
      usuario: session.usuario,
      nivel: session.nivel,
      loginAt: session.loginAt,
      timeRemaining: `${getTimeRemaining()} min`,
      isNearTimeout: isNearTimeout()
    };
  };


  /**
   * Obter JWT token da sessão atual (para chamadas autenticadas à API)
   */
  const getToken = () => {
    return getSession()?.token || null;
  };
  return {
    getSession,
    getCurrentUser,
    getCurrentLevel,
    isAuthenticated,
    login,
    logout,
    refresh,
    updateActivity,
    isNearTimeout,
    getTimeRemaining,
    getDebugInfo,
    getToken,
    clearSenhaTemporaria,
    SESSION_TIMEOUT
  };
})();


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
  const SESSION_TIMEOUT = 8 * 60 * 60 * 1000; // 8 horas

  /**
   * Obter dados da sessão ativa
   * Retorna null se não há sessão ou se expirou
   */
  const getSession = () => {
    try {
      const sessionData = sessionStorage.getItem(SESSION_KEY);
      if (!sessionData) return null;

      const session = JSON.parse(sessionData);

      // Verificar timeout
      const loginTime = new Date(session.loginAt).getTime();
      const elapsed = Date.now() - loginTime;

      if (elapsed > SESSION_TIMEOUT) {
        console.warn('[SessionManager] Sessão expirada');
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
      nivel: session.nivel
    };
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
  const login = (user) => {
    try {
      if (!user || !user.id || !user.usuario || !user.nivel) {
        console.error('[SessionManager] Dados de usuário inválidos');
        return false;
      }

      const session = {
        userId: user.id,
        usuario: user.usuario,
        nivel: user.nivel,
        loginAt: new Date().toISOString(),
        token: _generateToken()
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
   * Renovar token da sessão (refresh)
   */
  const refresh = () => {
    const session = getSession();
    if (!session) return false;

    try {
      session.token = _generateToken();
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
      return true;
    } catch (error) {
      console.error('[SessionManager] Erro ao renovar sessão:', error);
      return false;
    }
  };

  /**
   * Gerar token simples (não é JWT, apenas uma string)
   */
  const _generateToken = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let token = '';
    for (let i = 0; i < 32; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
  };

  /**
   * Verificar se a sessão está próxima do timeout
   * @param {number} warningMinutes - Minutos antes do timeout para avisar
   * @returns {boolean}
   */
  const isNearTimeout = (warningMinutes = 5) => {
    const session = getSession();
    if (!session) return false;

    const loginTime = new Date(session.loginAt).getTime();
    const elapsed = Date.now() - loginTime;
    const warningThreshold = SESSION_TIMEOUT - (warningMinutes * 60 * 1000);

    return elapsed > warningThreshold;
  };

  /**
   * Obter tempo restante da sessão em minutos
   */
  const getTimeRemaining = () => {
    const session = getSession();
    if (!session) return 0;

    const loginTime = new Date(session.loginAt).getTime();
    const elapsed = Date.now() - loginTime;
    const remaining = Math.max(0, SESSION_TIMEOUT - elapsed);

    return Math.floor(remaining / 60000); // Retornar em minutos
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

  return {
    getSession,
    getCurrentUser,
    getCurrentLevel,
    isAuthenticated,
    login,
    logout,
    refresh,
    isNearTimeout,
    getTimeRemaining,
    getDebugInfo,
    SESSION_TIMEOUT
  };
})();

/**
 * AppBootstrap — Inicialização da Aplicação Speed Teste DBSync
 * 
 * Fluxo:
 * 1. Carregar dados do localStorage (storage managers)
 * 2. Verificar sessão ativa
 * 3. Se não autenticado: mostrar login ou primeiro acesso
 * 4. Se autenticado: carregar interface principal
 */

const AppBootstrap = (() => {
  /**
   * Inicializar aplicação
   */
  const init = async () => {
    console.log('%cSpeed Teste DBSync', 'font-size:16px;font-weight:bold;color:#003761;');
    console.log('[AppBootstrap] Inicializando aplicação...');

    try {
      // ========== STEP 0: Inicializar IndexedDB de resultados ==========
      await ResultsManager.init();
      await UsersManager.init();

      // ========== STEP 1: Carregar dados persistentes ==========
      console.log('[AppBootstrap] Carregando dados do localStorage...');
      
      // Carregar storage managers (migração automática v2→v3 acontece aqui)
      const usersCount = UsersManager.count();
      const profilesCount = ProfilesManager.count();
      const groupsCount = GroupsManager.count();
      
      console.log(`[AppBootstrap] Dados carregados: ${usersCount} usuários, ${profilesCount} perfis, ${groupsCount} grupos`);

      // ========== STEP 2: Verificar autenticação ==========
      console.log('[AppBootstrap] Verificando sessão ativa...');
      
      const isAuthed = SessionManager.isAuthenticated();
      const currentUser = SessionManager.getCurrentUser();

      if (isAuthed && currentUser) {
        if (currentUser.senhaTemporaria) {
          console.log('[AppBootstrap] Senha temporária detectada — solicitando troca');
          LoginScreenManager.renderForcePasswordChange(currentUser);
        } else {
          _loadMainApp(currentUser);
        }
      } else {
        console.log('[AppBootstrap] Nenhuma sessão ativa');
        _showAuthScreen();
      }

      // ========== STEP 3: Setup de event listeners globais ==========
      _setupGlobalListeners();

      // ========== STEP 4: Setup de monitoramento ==========
      _setupMonitoring();

    } catch (error) {
      console.error('[AppBootstrap] Erro crítico na inicialização:', error);
      _showErrorScreen('Erro ao inicializar aplicação: ' + error.message);
    }
  };

  /**
   * Mostrar telas de autenticação
   */
  const _showAuthScreen = () => {
    // LoginScreenManager.show() retorna true se renderizou algo
    const shown = LoginScreenManager.show();
    
    if (!shown) {
      console.error('[AppBootstrap] Erro ao renderizar tela de autenticação');
      _showErrorScreen('Erro ao renderizar tela de login');
    }
  };

  /**
   * Carregar interface principal
   */
  const _loadMainApp = (currentUser) => {
    console.log('[AppBootstrap] Carregando interface principal...');
    Renderer.renderMainApp(currentUser);
    // Sincronizar todas as entidades Turso em background (migra localStorage se Turso vazio)
    ResultsManager.syncFromTurso();
    GroupsManager.syncFromTurso?.().catch(() => {});
    EndpointsManager.syncFromTurso?.().catch(() => {});
    MethodsManager.syncFromTurso?.().catch(() => {});
    SchedulerManager.syncFromTurso?.().catch(() => {});
    ProfilesManager.syncFromTurso?.().catch(() => {});

    // Alertar se sessão não tem JWT (login via localStorage antigo — sem sync API)
    if (!SessionManager.getToken?.()) {
      setTimeout(() => {
        if (typeof NotificationsManager !== 'undefined') {
          NotificationsManager.warning(
            'Sessão sem token de API. Faça logout e login novamente para sincronizar dados entre navegadores.',
            12000
          );
        }
      }, 2000);
    }
    try {
      ScheduleRunner.start();
    } catch (error) {
      console.warn('[AppBootstrap] Não foi possível iniciar ScheduleRunner:', error);
    }
  };

  /**
   * Mostrar tela de erro
   */
  const _showErrorScreen = (message) => {
    const container = document.getElementById('app') || document.body;
    container.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:center;height:100vh;background:#F8F9FA;">
        <div style="background:#FFFFFF;border-radius:12px;box-shadow:0 4px 12px rgba(0,0,0,0.08);padding:40px;max-width:400px;text-align:center;">
          <div style="color:#DC2626;font-size:24px;margin-bottom:20px;">⚠️</div>
          <h2 style="color:#1F2937;margin-bottom:10px;">Erro</h2>
          <p style="color:#6B7280;margin-bottom:20px;">${message}</p>
          <button onclick="window.location.reload()" style="padding:10px 20px;background:#003761;color:#FFFFFF;border:none;border-radius:6px;cursor:pointer;">
            Tentar Novamente
          </button>
        </div>
      </div>
    `;
  };

  /**
   * Setup de event listeners globais
   */
  const _setupGlobalListeners = () => {
    // Listener: session:login
    window.addEventListener('session:login', (e) => {
      console.log('[AppBootstrap] Evento: login bem-sucedido');
      setTimeout(() => window.location.reload(), 500);
    });

    // Listener: session:logout
    window.addEventListener('session:logout', (e) => {
      console.log('[AppBootstrap] Evento: logout');
      setTimeout(() => window.location.reload(), 500);
    });

    // Rastrear atividade do usuário para timeout por inatividade (debounce 5s)
    let _activityDebounce = null;
    const _onUserActivity = () => {
      if (_activityDebounce) return;
      _activityDebounce = setTimeout(() => {
        SessionManager.updateActivity();
        _activityDebounce = null;
      }, 5000);
    };
    ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'].forEach(evt => {
      document.addEventListener(evt, _onUserActivity, { passive: true });
    });

    // Listener: session timeout warning
    setInterval(() => {
      if (SessionManager.isNearTimeout(5)) {
        console.warn('[AppBootstrap] Aviso: sessão vence em menos de 5 minutos por inatividade');
        if (typeof NotificationsManager !== 'undefined') {
          NotificationsManager.warning('Sua sessão expira em menos de 5 minutos por inatividade.');
        }
      }
    }, 60000); // Verificar a cada minuto
  };

  /**
   * Setup de monitoramento e debug
   */
  const _setupMonitoring = () => {
    window.STP_DEBUG = {
      session: () => SessionManager.getDebugInfo(),
      rbac: () => RBACManager.getDebugInfo(),
      storage: () => ({
        users: UsersManager.count(),
        profiles: ProfilesManager.count(),
        groups: GroupsManager.count(),
        scenarios: ScenariosManager.count(),
        results: ResultsManager.count()
      }),
      renderer: () => ({ tab: Renderer.getCurrentTab() }),
      notifications: () => NotificationsManager,
      logout: () => SessionManager.logout(),
      login: async (usuario, senha) => {
        const user = await UsersManager.validate(usuario, senha);
        if (user) SessionManager.login(user);
        return user;
      }
    };

    console.log('[AppBootstrap] Debug disponível via window.STP_DEBUG');
  };

  /**
   * Validar que todos os módulos obrigatórios estão carregados
   */
  const _validateModules = () => {
    const required = [
      'StorageEngine', 'UsersManager', 'ProfilesManager', 'GroupsManager',
      'ScenariosManager', 'ResultsManager', 'SchedulerManager', 'AuditLogManager',
      'EndpointsManager',
      'SessionManager', 'RBACManager',
      'LoginScreenManager', 'SidebarManager', 'NotificationsManager', 'ModalManager', 'Renderer',
      'ConfigEngine', 'XMLEngine', 'UtilsEngine', 'RunnerEngine',
      'ScenarioExecutor', 'ScheduleRunner', 'ReportsManager'
    ];

    const missing = required.filter(mod => {
      try {
        return eval(`typeof ${mod} === 'undefined'`);
      } catch {
        return true;
      }
    });
    
    if (missing.length > 0) {
      throw new Error(`Módulos obrigatórios faltando: ${missing.join(', ')}`);
    }

    console.log('[AppBootstrap] Todos os módulos carregados ✓');
  };

  /**
   * Executar na primeira carga do documento
   */
  const start = () => {
    const run = async () => {
      _validateModules();
      await init();
    };
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        run().catch(err => _showErrorScreen('Erro ao inicializar: ' + err.message));
      });
    } else {
      run().catch(err => _showErrorScreen('Erro ao inicializar: ' + err.message));
    }
  };

  return {
    start,
    init
  };
})();

// Iniciar assim que o script for carregado
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', AppBootstrap.start);
} else {
  AppBootstrap.start();
}


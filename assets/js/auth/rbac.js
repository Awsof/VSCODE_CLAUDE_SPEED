/**
 * RBACManager — Controle de Acesso Baseado em Papéis (Role-Based Access Control)
 * Define permissões para cada nível de usuário
 * 
 * Níveis:
 * - admin: Acesso completo
 * - operador: Acesso parcial (recursos próprios)
 * - visualizador: Apenas leitura de resultados
 */

const RBACManager = (() => {
  /**
   * Matriz de permissões
   * Formato: recurso -> nível -> boolean
   */
  const PERMISSIONS = {
    // Gestão de usuários
    'users:list': { admin: true, operador: false, visualizador: false },
    'users:create': { admin: true, operador: false, visualizador: false },
    'users:edit': { admin: true, operador: false, visualizador: false },
    'users:delete': { admin: true, operador: false, visualizador: false },
    'users:manage': { admin: true, operador: false, visualizador: false },

    // Gestão de perfis
    'profiles:list': { admin: true, operador: true, visualizador: true },
    'profiles:create': { admin: true, operador: true, visualizador: false },
    'profiles:edit': { admin: true, operador: true, visualizador: false }, // Operador edita os seus
    'profiles:delete': { admin: true, operador: true, visualizador: false },
    'profiles:view_all': { admin: true, operador: false, visualizador: false }, // Admin vê de todos

    // Gestão de grupos
    'groups:list': { admin: true, operador: true, visualizador: false },
    'groups:create': { admin: true, operador: true, visualizador: false },
    'groups:edit': { admin: true, operador: true, visualizador: false },
    'groups:delete': { admin: true, operador: true, visualizador: false },
    'groups:view_all': { admin: true, operador: false, visualizador: false },

    // Gestão de cenários (checklists)
    'scenarios:list': { admin: true, operador: true, visualizador: false },
    'scenarios:create': { admin: true, operador: true, visualizador: false },
    'scenarios:edit': { admin: true, operador: true, visualizador: false },
    'scenarios:delete': { admin: true, operador: true, visualizador: false },
    'scenarios:execute': { admin: true, operador: true, visualizador: false },
    'scenarios:view_all': { admin: true, operador: false, visualizador: false },

    // Execução de testes
    'tests:execute_manual': { admin: true, operador: true, visualizador: false },
    'tests:execute_scheduled': { admin: true, operador: true, visualizador: false },

    // Gestão de agendamentos (scheduler)
    'scheduler:list': { admin: true, operador: true, visualizador: false },
    'scheduler:create': { admin: true, operador: true, visualizador: false },
    'scheduler:edit': { admin: true, operador: true, visualizador: false },
    'scheduler:delete': { admin: true, operador: true, visualizador: false },
    'scheduler:toggle': { admin: true, operador: true, visualizador: false },
    'scheduler:view_all': { admin: true, operador: false, visualizador: false },

    // Visualização de resultados
    'results:list': { admin: true, operador: true, visualizador: true },
    'results:view_detail': { admin: true, operador: true, visualizador: true },
    'results:export': { admin: true, operador: true, visualizador: false },
    'results:delete': { admin: true, operador: false, visualizador: false },
    'results:view_all': { admin: true, operador: false, visualizador: false }, // Operador vê seus

    // Importação/Exportação
    'import:profiles': { admin: true, operador: true, visualizador: false },
    'export:config': { admin: true, operador: true, visualizador: false },
    'export:results': { admin: true, operador: true, visualizador: false },

    // Configuração geral
    'settings:view': { admin: true, operador: false, visualizador: false },
    'settings:edit': { admin: true, operador: false, visualizador: false }
  };

  /**
   * Verificar se um nível tem permissão para um recurso
   * @param {string} nivel - admin, operador, visualizador
   * @param {string} recurso - Ex: "profiles:create", "results:export"
   * @returns {boolean}
   */
  const can = (nivel, recurso) => {
    if (!nivel) return false;

    const perms = PERMISSIONS[recurso];
    if (!perms) {
      console.warn(`[RBAC] Permissão desconhecida: ${recurso}`);
      return false;
    }

    return perms[nivel] === true;
  };

  /**
   * Verificar se o usuário atual tem permissão
   * Se não há sessão ativa, retorna false
   */
  const canCurrent = (recurso) => {
    const nivel = SessionManager.getCurrentLevel();
    if (!nivel) return false;
    return can(nivel, recurso);
  };

  /**
   * Verificar múltiplas permissões (AND lógico)
   * Ex: requireAll("admin", ["users:create", "users:delete"])
   */
  const requireAll = (nivel, recursos) => {
    return recursos.every(recurso => can(nivel, recurso));
  };

  /**
   * Verificar múltiplas permissões (OR lógico)
   */
  const requireAny = (nivel, recursos) => {
    return recursos.some(recurso => can(nivel, recurso));
  };

  /**
   * Obter lista de permissões de um nível
   */
  const getPermissionsForLevel = (nivel) => {
    const perms = {};
    Object.entries(PERMISSIONS).forEach(([recurso, niveis]) => {
      if (niveis[nivel] === true) {
        perms[recurso] = true;
      }
    });
    return perms;
  };

  /**
   * Verificar se é admin
   */
  const isAdmin = (nivel = null) => {
    if (!nivel) nivel = SessionManager.getCurrentLevel();
    return nivel === 'admin';
  };

  /**
   * Verificar se é operador ou admin
   */
  const isOperator = (nivel = null) => {
    if (!nivel) nivel = SessionManager.getCurrentLevel();
    return nivel === 'operador' || nivel === 'admin';
  };

  /**
   * Verificar se é visualizador (qualquer nível)
   * Todos podem visualizar resultados
   */
  const isViewer = (nivel = null) => {
    if (!nivel) nivel = SessionManager.getCurrentLevel();
    return ['admin', 'operador', 'visualizador'].includes(nivel);
  };

  /**
   * Obter descrição do nível
   */
  const getLevelDescription = (nivel) => {
    const descriptions = {
      admin: 'Administrador — Acesso completo',
      operador: 'Operador — Criar e gerenciar recursos próprios',
      visualizador: 'Visualizador — Apenas visualizar resultados'
    };
    return descriptions[nivel] || 'Desconhecido';
  };

  /**
   * Obter lista de níveis disponíveis
   */
  const getLevels = () => {
    return ['admin', 'operador', 'visualizador'];
  };

  /**
   * Validar se é um nível válido
   */
  const isValidLevel = (nivel) => {
    return getLevels().includes(nivel);
  };

  /**
   * Obter informações de permissões para debug
   */
  const getDebugInfo = () => {
    const nivelAtual = SessionManager.getCurrentLevel();
    return {
      nivelAtual,
      permissoes: nivelAtual ? getPermissionsForLevel(nivelAtual) : {},
      totalPermissoes: nivelAtual 
        ? Object.keys(getPermissionsForLevel(nivelAtual)).length 
        : 0,
      totalRecursos: Object.keys(PERMISSIONS).length
    };
  };

  return {
    can,
    canCurrent,
    requireAll,
    requireAny,
    getPermissionsForLevel,
    isAdmin,
    isOperator,
    isViewer,
    getLevelDescription,
    getLevels,
    isValidLevel,
    getDebugInfo,
    PERMISSIONS
  };
})();

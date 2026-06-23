/**
 * SidebarManager — renderiza navegação lateral
 */
const SidebarManager = (() => {
  const NAV_ITEMS = [
    { category: 'Análise' },
    { id: 'dashboard', label: 'Dashboard',     icon: '🏠', permission: null },
    { id: 'results',   label: 'Resultados',    icon: '📊', permission: 'results:list' },
    { id: 'reports',   label: 'Relatórios',    icon: '📄', permission: 'export:results' },
    { category: 'Operacional' },
    { id: 'profiles',  label: 'Testes',        icon: '🧾', permission: 'profiles:list' },
    { id: 'groups',    label: 'Grupos',        icon: '🗂️', permission: 'groups:list' },
    { id: 'schedules', label: 'Agendamentos',  icon: '⏰', permission: 'scheduler:list' },
    { category: 'Ajustes' },
    { id: 'methods',   label: 'Métodos SOAP',  icon: '⚡', permission: 'profiles:list' },
    { id: 'users',     label: 'Usuários',      icon: '👥', permission: 'users:manage' },
    { id: 'settings',  label: 'Configurações', icon: '⚙️', permission: 'settings:view' }
  ];

  const _isAllowed = (item) => {
    if (!item.permission) return true;
    return RBACManager.canCurrent(item.permission);
  };

  let _timerInterval = null;

  const _updateTimer = () => {
    const el = document.getElementById('sidebar-session-timer');
    if (!el) {
      clearInterval(_timerInterval);
      _timerInterval = null;
      return;
    }
    const remaining = SessionManager.getTimeRemaining();
    el.textContent = remaining > 0 ? `${remaining} min` : 'Sessão expirada';
  };

  const render = (user, activeId, onNavigate) => {
    const sidebar = document.getElementById('app-sidebar');
    if (!sidebar) return;

    if (_timerInterval) {
      clearInterval(_timerInterval);
      _timerInterval = null;
    }

    const visibleItems = NAV_ITEMS.filter(item => item.category || _isAllowed(item));
    const countdown = SessionManager.getTimeRemaining();
    const timeLabel = countdown > 0 ? `${countdown} min` : 'Sessão expirada';
    const role = RBACManager.getLevelDescription(user.nivel);

    sidebar.innerHTML = `
      <div class="nav-section">
        <div style="display:flex;flex-direction:column;align-items:center;text-align:center;padding:8px 0 22px;">
          <img src="assets/logo.svg" alt="Grupo DB" class="app-logo-image" style="height:56px;margin-bottom:8px;" />
          <div style="font-size:0.88rem;font-weight:600;color:var(--text);margin-top:2px;">Speed Teste DBSync</div>
          <div style="font-size:0.75rem;color:var(--text-muted);letter-spacing:0.1em;margin-top:2px;">Monitor de Performance</div>
        </div>
        ${visibleItems.map(item => {
          if (item.category) return `<div style="font-size:0.68rem;font-weight:700;color:var(--text-muted);letter-spacing:0.1em;text-transform:uppercase;padding:14px 16px 4px;margin-top:2px;">${item.category}</div>`;
          return `<button class="nav-item ${item.id === activeId ? 'active' : ''}" data-tab="${item.id}" type="button">
               <span class="nav-item-icon">${item.icon}</span>
               <span>${item.label}</span>
             </button>`;
        }).join('')}
      </div>
      <div class="sidebar-footer">
        <div class="section-card" style="padding:12px 16px;">
          <div style="font-size:0.92rem;font-weight:700;color:var(--text);">${user.usuario}</div>
          <div style="font-size:0.8rem;color:var(--text-muted);margin-top:4px;">${role}</div>
          <div style="margin-top:10px;display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
            <span class="badge info" id="sidebar-session-timer">${timeLabel}</span>
            <button class="button secondary small" id="btn-logout" type="button">Sair</button>
          </div>
          <div style="margin-top:10px;">
            <a href="guia-usuario.html" target="_blank" class="button secondary small" style="display:inline-flex;align-items:center;gap:6px;text-decoration:none;width:100%;justify-content:center;" title="Abrir Guia do Usuário">
              <svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor" style="flex-shrink:0;"><path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>
              Guia do Usuário
            </a>
          </div>
        </div>
      </div>
    `;

    sidebar.querySelectorAll('.nav-item').forEach(button => {
      button.addEventListener('click', () => {
        const tab = button.dataset.tab;
        if (typeof onNavigate === 'function') onNavigate(tab);
      });
    });

    _timerInterval = setInterval(_updateTimer, 60000);
  };

  return {
    render
  };
})();

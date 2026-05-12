/**
 * SidebarManager — renderiza navegação lateral
 */
const SidebarManager = (() => {
  const NAV_ITEMS = [
    { id: 'dashboard', label: 'Dashboard', icon: '🏠', permission: null },
    { id: 'methods', label: 'Métodos SOAP', icon: '⚡', permission: 'profiles:list' },
    { id: 'profiles', label: 'Testes', icon: '🧾', permission: 'profiles:list' },
    { id: 'groups', label: 'Grupos', icon: '🗂️', permission: 'groups:list' },
    { id: 'scenarios', label: 'Cenários', icon: '✅', permission: 'scenarios:list' },
    { id: 'schedules', label: 'Agendamentos', icon: '⏰', permission: 'scheduler:list' },
    { id: 'results', label: 'Resultados', icon: '📊', permission: 'results:list' },
    { id: 'reports', label: 'Relatórios', icon: '📄', permission: 'export:results' },
    { id: 'users', label: 'Usuários', icon: '👥', permission: 'users:manage' },
    { id: 'settings', label: 'Configurações', icon: '⚙️', permission: 'settings:view' }
  ];

  const _isAllowed = (item) => {
    if (!item.permission) return true;
    return RBACManager.canCurrent(item.permission);
  };

  const render = (user, activeId, onNavigate) => {
    const sidebar = document.getElementById('app-sidebar');
    if (!sidebar) return;

    const visibleItems = NAV_ITEMS.filter(_isAllowed);
    sidebar.innerHTML = `
      <div class="nav-section">
        <div style="display:flex;flex-direction:column;align-items:center;text-align:center;padding:8px 0 22px;">
          <img src="assets/logo.svg" alt="Grupo DB" class="app-logo-image" style="height:52px;margin-bottom:10px;" />
          <div style="font-size:1.05rem;font-weight:800;color:var(--primary-dark);letter-spacing:0.03em;">Grupo DB</div>
          <div style="font-size:0.88rem;font-weight:600;color:var(--text);margin-top:2px;">Speed Teste DBSync</div>
          <div style="font-size:0.75rem;color:var(--text-muted);letter-spacing:0.1em;margin-top:2px;">Monitor de Performance</div>
        </div>
        <div class="nav-title">Navegação</div>
        ${visibleItems.map(item => `
          <button class="nav-item ${item.id === activeId ? 'active' : ''}" data-tab="${item.id}" type="button">
            <span class="nav-item-icon">${item.icon}</span>
            <span>${item.label}</span>
          </button>
        `).join('')}
      </div>
      <div class="sidebar-footer">
        <div class="section-card" style="padding:16px;">
          <div style="font-size:0.92rem;font-weight:700;color:var(--text);">${user.usuario}</div>
          <div style="font-size:0.82rem;color:var(--text-muted);margin-top:6px;">${RBACManager.getLevelDescription(user.nivel)}</div>
        </div>
      </div>
    `;

    sidebar.querySelectorAll('.nav-item').forEach(button => {
      button.addEventListener('click', () => {
        const tab = button.dataset.tab;
        if (typeof onNavigate === 'function') onNavigate(tab);
      });
    });
  };

  return {
    render
  };
})();

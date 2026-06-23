/**
 * NotificationsManager — Toast notifications
 */
const NotificationsManager = (() => {
  const CONTAINER_ID = 'stp-toast-container';

  const _ensureContainer = () => {
    let container = document.getElementById(CONTAINER_ID);
    if (!container) {
      container = document.createElement('div');
      container.id = CONTAINER_ID;
      container.style.position = 'fixed';
      container.style.bottom = '24px';
      container.style.right = '24px';
      container.style.display = 'flex';
      container.style.flexDirection = 'column';
      container.style.gap = '12px';
      container.style.zIndex = '9999';
      document.body.appendChild(container);
    }
    return container;
  };

  const notify = (message, type = 'info', duration = 4200) => {
    const container = _ensureContainer();
    const toast = document.createElement('div');
    toast.className = `toast-enter notification-${type}`;
    toast.style.background = 'var(--surface)';
    toast.style.border = '1px solid var(--border)';
    toast.style.borderLeft = type === 'success' ? '4px solid var(--success)' : type === 'warning' ? '4px solid var(--warning)' : type === 'danger' ? '4px solid var(--danger)' : '4px solid var(--primary)';
    toast.style.color = 'var(--text)';
    toast.style.padding = '14px 16px';
    toast.style.borderRadius = '14px';
    toast.style.boxShadow = 'var(--shadow)';
    toast.style.minWidth = '260px';
    toast.style.maxWidth = '360px';
    toast.style.fontSize = '0.95rem';
    toast.style.fontFamily = 'var(--font-sans)';
    toast.style.opacity = '0';
    toast.style.animation = 'fadeInUp 0.35s ease forwards';
    toast.textContent = message;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'opacity 140ms ease, transform 140ms ease';
      setTimeout(() => {
        toast.remove();
      }, 150);
    }, duration);
  };

  return {
    notify,
    info: (msg, duration) => notify(msg, 'info', duration),
    success: (msg, duration) => notify(msg, 'success', duration),
    warning: (msg, duration) => notify(msg, 'warning', duration),
    danger: (msg, duration) => notify(msg, 'danger', duration),
  };
})();

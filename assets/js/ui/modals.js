/**
 * ModalManager — UI modal dialog helper
 */
const ModalManager = (() => {
  const MODAL_ID = 'stp-modal-root';

  const _ensureRoot = () => {
    let root = document.getElementById(MODAL_ID);
    if (!root) {
      root = document.createElement('div');
      root.id = MODAL_ID;
      document.body.appendChild(root);
    }
    return root;
  };

  const open = ({ title, body, confirmText = 'Confirmar', cancelText = 'Cancelar', onConfirm = null, onCancel = null, width = '520px' }) => {
    const root = _ensureRoot();
    root.innerHTML = `
      <div class="modal-backdrop" id="${MODAL_ID}-backdrop">
        <div class="modal-window" style="width:${width};">
          <div class="modal-header">
            <div class="modal-title">${title}</div>
            <button class="modal-close" type="button" id="${MODAL_ID}-close">✕</button>
          </div>
          <div class="modal-body">${body}</div>
          <div class="modal-actions">
            <button class="button secondary" id="${MODAL_ID}-cancel">${cancelText}</button>
            <button class="button primary" id="${MODAL_ID}-confirm">${confirmText}</button>
          </div>
        </div>
      </div>
    `;

    const backdrop = document.getElementById(`${MODAL_ID}-backdrop`);
    const close = () => {
      root.innerHTML = '';
      if (typeof onCancel === 'function') onCancel();
    };

    const confirm = () => {
      root.innerHTML = '';
      if (typeof onConfirm === 'function') onConfirm();
    };

    document.getElementById(`${MODAL_ID}-close`).onclick = close;
    document.getElementById(`${MODAL_ID}-cancel`).onclick = close;
    document.getElementById(`${MODAL_ID}-confirm`).onclick = confirm;
    backdrop.onclick = (event) => {
      if (event.target === backdrop) close();
    };
  };

  const close = () => {
    const root = document.getElementById(MODAL_ID);
    if (root) root.innerHTML = '';
  };

  const confirm = ({ title, body, confirmText = 'Confirmar', cancelText = 'Cancelar', onConfirm = null, onCancel = null }) => {
    open({ title, body, confirmText, cancelText, onConfirm, onCancel });
  };

  return {
    open,
    close,
    confirm
  };
})();

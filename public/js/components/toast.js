// ===== TOAST NOTIFICATIONS =====

const Toast = {
  container: null,
  
  init() {
    this.container = document.getElementById('toast-container');
  },

  show(message, type = 'info', duration = 3000) {
    if (!this.container) this.init();
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
        ${type === 'success' ? '<path d="m9 12 2 2 4-4"/><circle cx="12" cy="12" r="10"/>' :
          type === 'error' ? '<circle cx="12" cy="12" r="10"/><line x1="15" x2="9" y1="9" y2="15"/><line x1="9" x2="15" y1="9" y2="15"/>' :
          type === 'warning' ? '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" x2="12" y1="9" y2="13"/><line x1="12" x2="12.01" y1="17" y2="17"/>' :
          '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>'}
      </svg>
      <span>${Utils.escapeHtml(message)}</span>
    `;
    
    this.container.appendChild(toast);
    
    setTimeout(() => {
      toast.classList.add('toast-exit');
      setTimeout(() => toast.remove(), 200);
    }, duration);
  }
};
// js/toast.js
// Simple toast utility: toast.show(message, { duration, type })
(function (global) {
  function ensureContainer() {
    let c = document.getElementById('toast-container');
    if (!c) {
      c = document.createElement('div');
      c.id = 'toast-container';
      document.body.appendChild(c);
    }
    return c;
  }

  function show(message, opts = {}) {
    const duration = typeof opts.duration === 'number' ? opts.duration : 2200;
    const type = opts.type || 'success'; // success | info | error
    const small = opts.small ? ' small' : '';
    const container = ensureContainer();
    const toast = document.createElement('div');
    toast.className = `toast ${type}${small}`;
    toast.textContent = message;
    container.appendChild(toast);

    // Auto remove after duration
    const timeout = setTimeout(() => {
      toast.style.transition = 'transform .18s, opacity .18s';
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(6px) scale(.98)';
      setTimeout(() => { container.removeChild(toast); }, 220);
    }, duration);

    // Allow click to dismiss
    toast.addEventListener('click', () => {
      clearTimeout(timeout);
      try { toast.remove(); } catch (e) {}
    });

    return {
      dismiss: () => { try { toast.remove(); } catch (e) {} }
    };
  }

  global.toast = { show };
})(window);

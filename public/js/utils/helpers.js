// ===== UTILITY HELPERS =====

const Utils = {
  // Format seconds to mm:ss
  formatTime(seconds) {
    if (!seconds || seconds < 0) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  },

  // Debounce
  debounce(fn, ms) {
    let timer;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), ms);
    };
  },

  // Throttle
  throttle(fn, ms) {
    let last = 0;
    return function (...args) {
      const now = Date.now();
      if (now - last >= ms) {
        last = now;
        fn.apply(this, args);
      }
    };
  },

  // Safe HTML escaping
  escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },

  // Generate unique ID
  uid() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  },

  // Deep clone
  clone(obj) {
    return JSON.parse(JSON.stringify(obj));
  },

  // Get greeting based on time
  getGreeting() {
    const h = new Date().getHours();
    if (h < 6) return 'Good night';
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  },

  // Relative time
  timeAgo(timestamp) {
    if (!timestamp) return '';
    const diff = Date.now() - timestamp;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(timestamp).toLocaleDateString();
  },

  // Generate artwork placeholder SVG
  artworkPlaceholder(size = 48) {
    const s = Math.round(size * 0.4);
    return '<svg viewBox="0 0 24 24" width="' + s + '" height="' + s + '" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>';
  },

  // Create artwork HTML.
  // Strategy: always render the placeholder behind the image.
  // If image loads, it covers the placeholder.
  // If image fails, the onerror handler (attached globally) hides it.
  // No inline event handlers — avoids all quoting/escaping issues.
  artworkHtml(url, size = 48, alt = '') {
    const placeholder = '<div class="artwork-placeholder">' + this.artworkPlaceholder(size) + '</div>';
    if (url) {
      const esc = this.escapeHtml(url);
      const escAlt = this.escapeHtml(alt);
      return placeholder + '<img src="' + esc + '" alt="' + escAlt + '" loading="lazy" width="' + size + '" height="' + size + '" class="artwork-img">';
    }
    return placeholder;
  },

  // Create source badge HTML
  sourceBadge(provider) {
    return '<span class="source-badge ' + provider + '">' + provider.toUpperCase() + '</span>';
  },

  // Create track type indicator
  trackTypeBadge(playbackType) {
    if (playbackType === 'full') {
      return '<span class="track-type full">Full song</span>';
    }
    if (playbackType === 'embedded') {
      return '<span class="track-type embedded">Embedded playback</span>';
    }
    return '<span class="track-type preview">30-sec preview</span>';
  },

  // Show toast notification
  showToast(message, type = 'info', duration = 3000) {
    Toast.show(message, type, duration);
  },

  // Is input focused
  isInputFocused() {
    const el = document.activeElement;
    return el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
  },

  // Simple event emitter
  _listeners: {},
  on(event, fn) {
    if (!this._listeners[event]) this._listeners[event] = [];
    this._listeners[event].push(fn);
  },
  off(event, fn) {
    if (!this._listeners[event]) return;
    this._listeners[event] = this._listeners[event].filter(f => f !== fn);
  },
  emit(event, data) {
    if (!this._listeners[event]) return;
    this._listeners[event].forEach(fn => fn(data));
  },

  // Request with abort support
  async fetchJSON(url, options = {}) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options.timeout || 15000);
    
    try {
      const res = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timeout);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return await res.json();
    } catch (err) {
      clearTimeout(timeout);
      throw err;
    }
  }
};

// Global image error handler — delegated, no inline handlers needed
document.addEventListener('error', function(e) {
  if (e.target.tagName === 'IMG' && e.target.classList.contains('artwork-img')) {
    e.target.style.display = 'none';
  }
}, true);
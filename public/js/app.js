// ===== MAIN APPLICATION =====

const App = {
  init() {
    console.log('Resonance Music Explorer initializing...');
    
    // Initialize store
    Store.init();
    
    // Initialize components
    Toast.init();
    Player.init();
    
    // Initialize router
    Router.init();
    
    // Setup global search
    this._setupSearch();
    
    // Setup keyboard shortcuts
    this._setupKeyboard();
    
    // Setup mobile menu
    this._setupMobileMenu();
    
    // Setup queue panel
    this._setupQueuePanel();
    
    // Setup provider status
    this._setupProviderStatus();
    
    // Setup shortcuts modal
    this._setupShortcutsModal();
    
    // Apply initial ambient mode
    if (Store.state.ambientMode) {
      document.getElementById('ambient-bg')?.classList.add('active');
    }
    
    // Load provider health
    this._loadProviderHealth();
    
    // Listen for events
    Utils.on('queue-changed', () => Player.renderQueuePanel());
    Utils.on('favorites-changed', () => {
      // Refresh current page if library
      if (Router.currentRoute === 'library') {
        Pages.renderLibrary('favorites');
      }
    });
    
    console.log('Resonance ready.');
  },

  // ===== SEARCH =====
  _setupSearch() {
    const input = document.getElementById('global-search');
    const clearBtn = document.getElementById('search-clear');
    const kbd = document.querySelector('.search-kbd');
    
    if (!input) return;
    
    // Debounced search
    const doSearch = Utils.debounce((query) => {
      if (query.trim().length > 0) {
        Router.doSearch(query);
      }
    }, 400);
    
    input.addEventListener('input', () => {
      const val = input.value;
      clearBtn?.classList.toggle('hidden', val.length === 0);
      kbd?.classList.toggle('hidden', val.length > 0);
      
      if (val.length > 0) {
        doSearch(val);
      }
    });
    
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const val = input.value.trim();
        if (val) {
          API.cancelSearch(); // Cancel any debounced search
          Router.doSearch(val);
        }
      }
    });
    
    clearBtn?.addEventListener('click', () => {
      input.value = '';
      clearBtn.classList.add('hidden');
      kbd?.classList.remove('hidden');
      input.focus();
      // Navigate to empty search
      Router.navigate('search');
    });
  },

  // ===== KEYBOARD SHORTCUTS =====
  _setupKeyboard() {
    document.addEventListener('keydown', (e) => {
      // Don't intercept when typing in inputs
      if (Utils.isInputFocused()) {
        // Only handle Escape in inputs
        if (e.key === 'Escape') {
          document.activeElement.blur();
        }
        return;
      }
      
      switch (e.key) {
        case ' ':
          e.preventDefault();
          Player.togglePlay();
          break;
          
        case 'ArrowLeft':
          e.preventDefault();
          if (e.shiftKey) {
            Player.seekTo(Math.max(0, Store.state.currentTime - 10));
          } else {
            Player.previous();
          }
          break;
          
        case 'ArrowRight':
          e.preventDefault();
          if (e.shiftKey) {
            Player.seekTo(Math.min(Store.state.duration, Store.state.currentTime + 10));
          } else {
            Player.next();
          }
          break;
          
        case 'ArrowUp':
          e.preventDefault();
          Player.setVolume(Math.min(100, Store.state.volume + 5));
          break;
          
        case 'ArrowDown':
          e.preventDefault();
          Player.setVolume(Math.max(0, Store.state.volume - 5));
          break;
          
        case 'm':
        case 'M':
          Player.toggleMute();
          break;
          
        case 'f':
        case 'F':
          Player.toggleFavorite();
          break;
          
        case 'q':
        case 'Q':
          Player._toggleQueue();
          break;
          
        case '/':
          e.preventDefault();
          document.getElementById('global-search')?.focus();
          break;
          
        case 'Escape':
          // Close open panels
          document.getElementById('full-player')?.classList.add('hidden');
          document.getElementById('queue-panel')?.classList.add('hidden');
          document.getElementById('sleep-modal')?.classList.add('hidden');
          document.getElementById('shortcuts-modal')?.classList.add('hidden');
          document.getElementById('provider-panel')?.classList.add('hidden');
          Store.state.showFullPlayer = false;
          break;
      }
    });
  },

  // ===== MOBILE MENU =====
  _setupMobileMenu() {
    const menuBtn = document.getElementById('mobile-menu-btn');
    const sidebar = document.getElementById('sidebar');
    
    if (!menuBtn || !sidebar) return;
    
    menuBtn.addEventListener('click', () => {
      sidebar.classList.toggle('open');
      
      // Create/remove overlay
      let overlay = document.querySelector('.sidebar-overlay');
      if (sidebar.classList.contains('open')) {
        if (!overlay) {
          overlay = document.createElement('div');
          overlay.className = 'sidebar-overlay';
          overlay.addEventListener('click', () => {
            sidebar.classList.remove('open');
            overlay.remove();
          });
          document.getElementById('app').appendChild(overlay);
        }
      } else {
        overlay?.remove();
      }
    });
    
    // Close menu on nav click
    sidebar.querySelectorAll('.nav-item').forEach(el => {
      el.addEventListener('click', () => {
        sidebar.classList.remove('open');
        document.querySelector('.sidebar-overlay')?.remove();
      });
    });
  },

  // ===== QUEUE PANEL =====
  _setupQueuePanel() {
    document.getElementById('queue-close')?.addEventListener('click', () => {
      document.getElementById('queue-panel')?.classList.add('hidden');
      Store.state.showQueue = false;
    });
    
    document.getElementById('queue-clear')?.addEventListener('click', () => {
      Store.clearQueue();
      Player._renderQueue();
    });
    
    document.getElementById('queue-shuffle-btn')?.addEventListener('click', () => {
      Store.shuffleQueue();
      Player._renderQueue();
    });
  },

  // ===== PROVIDER STATUS =====
  _setupProviderStatus() {
    document.getElementById('btn-provider-status')?.addEventListener('click', () => {
      const panel = document.getElementById('provider-panel');
      panel?.classList.toggle('hidden');
      if (!panel?.classList.contains('hidden')) {
        this._renderProviderStatus();
      }
    });
    
    document.getElementById('provider-close')?.addEventListener('click', () => {
      document.getElementById('provider-panel')?.classList.add('hidden');
    });
  },

  async _loadProviderHealth() {
    try {
      const health = await API.getProviderHealth();
      Store.state.providerHealth = health;
      this._renderProviderStatus();
    } catch (err) {
      console.warn('Provider health check failed:', err);
    }
  },

  _renderProviderStatus() {
    const list = document.getElementById('provider-list');
    if (!list) return;
    
    const providers = [
      { name: 'iTunes', key: 'itunes', playback: '30-sec preview', setup: false },
      { name: 'Deezer', key: 'deezer', playback: '30-sec preview', setup: false },
      { name: 'Audius', key: 'audius', playback: 'Full song', setup: false },
      { name: 'Jamendo', key: 'jamendo', playback: 'Full song', setup: true, env: 'JAMENDO_CLIENT_ID' },
      { name: 'YouTube', key: 'youtube', playback: 'Embedded playback', setup: true, env: 'YOUTUBE_API_KEY' }
    ];
    
    const health = Store.state.providerHealth;
    
    list.innerHTML = providers.map(p => {
      const h = health[p.key] || {};
      const status = h.status || 'unknown';
      const configured = h.configured !== false;
      
      let statusText, dotClass;
      if (status === 'available') {
        statusText = 'Available';
        dotClass = 'available';
      } else if (status === 'unconfigured') {
        statusText = 'Setup required';
        dotClass = 'unconfigured';
      } else if (status === 'cooldown') {
        statusText = 'Cooldown (retrying soon)';
        dotClass = 'cooldown';
      } else {
        statusText = 'Unknown';
        dotClass = 'unavailable';
      }
      
      return `
        <div class="provider-item">
          <span class="provider-dot ${dotClass}"></span>
          <div style="flex:1;min-width:0;">
            <div style="display:flex;align-items:center;gap:6px;">
              <span class="provider-name">${p.name}</span>
              ${Utils.sourceBadge(p.key)}
            </div>
            <div style="display:flex;gap:8px;margin-top:2px;">
              <span class="provider-status-text">${statusText}</span>
              ${status === 'available' ? `<span style="font-size:0.6875rem;color:var(--text-faint);">${p.playback}</span>` : ''}
            </div>
            ${status === 'unconfigured' && p.env ? `<div style="font-size:0.6875rem;color:var(--text-faint);margin-top:2px;">Requires: ${p.env}</div>` : ''}
          </div>
        </div>
      `;
    }).join('');
    
    // Add YouTube quota info
    if (health.youtube?.quota) {
      const q = health.youtube.quota;
      list.innerHTML += `
        <div style="padding:8px 12px;margin-top:8px;border-top:1px solid var(--border);font-size:0.75rem;color:var(--text-muted);">
          YouTube Data API quota: ${q.remaining}/${q.limit} units remaining today
        </div>
      `;
    }
  },

  // ===== SHORTCUTS MODAL =====
  _setupShortcutsModal() {
    document.getElementById('btn-shortcuts')?.addEventListener('click', () => {
      document.getElementById('shortcuts-modal')?.classList.toggle('hidden');
    });
    
    document.getElementById('shortcuts-close')?.addEventListener('click', () => {
      document.getElementById('shortcuts-modal')?.classList.add('hidden');
    });
    
    // Settings button
    document.getElementById('btn-settings')?.addEventListener('click', () => {
      Router.navigate('settings');
    });
  }
};

// ===== INITIALIZE =====
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
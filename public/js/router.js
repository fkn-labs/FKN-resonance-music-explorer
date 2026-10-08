// ===== CLIENT-SIDE ROUTER =====

const Router = {
  currentRoute: null,
  
  init() {
    // Listen for hash changes
    window.addEventListener('hashchange', () => this.handleRoute());
    
    // Intercept sidebar link clicks for reliable navigation
    document.querySelectorAll('.sidebar-nav .nav-item, .sidebar-footer .nav-item, .mobile-nav-item').forEach(el => {
      el.addEventListener('click', (e) => {
        const page = el.dataset.page;
        if (!page) return;
        e.preventDefault();
        this.navigate(page);
      });
    });
    
    // Handle initial route
    this.handleRoute();
  },

  handleRoute() {
    const hash = window.location.hash.slice(1) || '/';
    const [path, ...params] = hash.split('/').filter(Boolean);
    const page = path || 'discover';
    
    // Update active nav items
    this._updateNav(page);
    
    // Route to page
    switch (path) {
      case 'search':
        const query = decodeURIComponent(params.join('/') || '');
        if (query) {
          document.getElementById('global-search').value = query;
          Pages.renderSearch(query);
        } else {
          Pages.renderSearch('');
        }
        break;
      case 'library':
        Pages.renderLibrary(params[0] || 'favorites');
        break;
      case 'playlists':
        Pages.renderPlaylists(params[0] || null);
        break;
      case 'settings':
        Pages.renderSettings();
        break;
      default:
        Pages.renderDiscover();
        break;
    }
    
    this.currentRoute = page;
    
    // Scroll to top
    document.getElementById('page-container')?.scrollTo(0, 0);
  },

  navigate(page, param) {
    if (param) {
      window.location.hash = `/${page}/${param}`;
    } else {
      window.location.hash = `/${page}`;
    }
  },

  doSearch(query) {
    if (query?.trim()) {
      window.location.hash = `/search/${encodeURIComponent(query.trim())}`;
    }
  },

  _updateNav(page) {
    // Desktop sidebar — both main nav and footer
    document.querySelectorAll('.sidebar-nav .nav-item, .sidebar-footer .nav-item').forEach(el => {
      el.classList.toggle('active', el.dataset.page === page);
    });
    
    // Mobile nav
    document.querySelectorAll('.mobile-nav-item').forEach(el => {
      el.classList.toggle('active', el.dataset.page === page);
    });
  }
};
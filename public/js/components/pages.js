// ===== PAGE RENDERERS =====

const Pages = {
  // ===== DISCOVER PAGE =====
  async renderDiscover() {
    const container = document.getElementById('page-container');
    const greeting = Utils.getGreeting();
    
    container.innerHTML = `
      <div class="discover-page">
        <h1 class="discover-greeting">${greeting}</h1>
        
        ${Store.state.recentlyPlayed.length > 0 ? `
        <section class="discover-section">
          <div class="section-header">
            <h2 class="section-title">Recently Played</h2>
          </div>
          ${TrackRenderer.renderHScroll(Store.state.recentlyPlayed.slice(0, 8))}
        </section>
        ` : ''}
        
        <section class="discover-section" id="discover-trending">
          <div class="section-header">
            <h2 class="section-title">Trending on Audius</h2>
          </div>
          <div class="h-scroll">${TrackRenderer.renderSkeleton(6)}</div>
        </section>
        
        <section class="discover-section" id="discover-charts">
          <div class="section-header">
            <h2 class="section-title">Deezer Charts</h2>
          </div>
          <div class="h-scroll">${TrackRenderer.renderSkeleton(6)}</div>
        </section>
        
        <section class="discover-section" id="discover-new">
          <div class="section-header">
            <h2 class="section-title">New on Jamendo</h2>
          </div>
          <div class="h-scroll">${TrackRenderer.renderSkeleton(6)}</div>
        </section>
      </div>
    `;
    
    // Load discover data
    try {
      const data = await API.getDiscover();
      
      // Audius Trending
      if (data.audiusTrending?.tracks?.length > 0) {
        const section = document.getElementById('discover-trending');
        if (section) {
          const scrollContainer = section.querySelector('.h-scroll');
          if (scrollContainer) {
            const newHtml = TrackRenderer.renderHScroll(data.audiusTrending.tracks.slice(0, 12));
            scrollContainer.innerHTML = newHtml.replace(/<div class="h-scroll">/, '').replace(/<\/div>$/, '');
          }
        }
      } else {
        const section = document.getElementById('discover-trending');
        if (section) section.style.display = 'none';
      }
      
      // Deezer Charts
      if (data.deezerCharts?.tracks?.length > 0) {
        const section = document.getElementById('discover-charts');
        if (section) {
          const scrollContainer = section.querySelector('.h-scroll');
          if (scrollContainer) {
            const newHtml = TrackRenderer.renderHScroll(data.deezerCharts.tracks.slice(0, 12));
            scrollContainer.innerHTML = newHtml.replace(/<div class="h-scroll">/, '').replace(/<\/div>$/, '');
          }
        }
      } else {
        const section = document.getElementById('discover-charts');
        if (section) section.style.display = 'none';
      }
      
      // Jamendo New
      if (data.jamendoNew?.tracks?.length > 0) {
        const section = document.getElementById('discover-new');
        if (section) {
          const scrollContainer = section.querySelector('.h-scroll');
          if (scrollContainer) {
            const newHtml = TrackRenderer.renderHScroll(data.jamendoNew.tracks.slice(0, 12));
            scrollContainer.innerHTML = newHtml.replace(/<div class="h-scroll">/, '').replace(/<\/div>$/, '');
          }
        }
      } else {
        const section = document.getElementById('discover-new');
        if (section) section.style.display = 'none';
      }
      
      // Attach card listeners
      this._attachTrackListeners(container);
      
    } catch (err) {
      console.error('Discover load error:', err);
      // Show error state for sections with skeletons
      const sections = container.querySelectorAll('.discover-section');
      sections.forEach(section => {
        const scroll = section.querySelector('.h-scroll');
        if (scroll && scroll.querySelector('.skeleton')) {
          scroll.innerHTML = '<div style="padding:24px;color:var(--text-muted);font-size:0.875rem;">Unable to load content. Please try again later.</div>';
        }
      });
    }
  },

  // ===== SEARCH PAGE =====
  renderSearch(query = '') {
    const container = document.getElementById('page-container');
    
    if (!query) {
      const history = Store.getSearchHistory();
      container.innerHTML = `
        <div class="search-page">
          <div class="search-state">
            <div class="search-state-icon">
              <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            </div>
            <h3>Search for music</h3>
            <p>Find songs, artists, and albums from multiple sources in one place.</p>
          </div>
          ${history.length > 0 ? `
          <div style="max-width:400px;margin:0 auto;">
            <div class="section-header">
              <h3 class="section-title" style="font-size:1rem;">Recent Searches</h3>
            </div>
            <div class="track-list">
              ${history.slice(0, 8).map(q => `
                <div class="track-item" data-search-query="${Utils.escapeHtml(q)}">
                  <div class="track-artwork">
                    <div class="artwork-placeholder">
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    </div>
                  </div>
                  <div class="track-info">
                    <div class="track-title">${Utils.escapeHtml(q)}</div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
          ` : ''}
        </div>
      `;
      
      // Handle recent search clicks
      container.querySelectorAll('[data-search-query]').forEach(el => {
        el.addEventListener('click', () => {
          const q = el.dataset.searchQuery;
          document.getElementById('global-search').value = q;
          Router.doSearch(q);
        });
      });
      
      return;
    }
    
    // Show loading with animated skeletons
    container.innerHTML = `
      <div class="search-page">
        <div class="search-page-header">
          <h2 class="text-title">Searching for "${Utils.escapeHtml(query)}"</h2>
          <p style="color:var(--text-muted);font-size:0.875rem;margin-top:4px;">Checking multiple sources...</p>
        </div>
        <div class="search-loading">
          <div class="search-loading-group">
            <div style="margin-bottom:12px;"><span class="source-badge audius">AUDIUS</span> <span style="font-size:0.75rem;color:var(--text-muted);">Searching...</span></div>
            ${TrackRenderer.renderSkeleton(3)}
          </div>
          <div class="search-loading-group">
            <div style="margin-bottom:12px;"><span class="source-badge deezer">DEEZER</span> <span style="font-size:0.75rem;color:var(--text-muted);">Searching...</span></div>
            ${TrackRenderer.renderSkeleton(3)}
          </div>
          <div class="search-loading-group">
            <div style="margin-bottom:12px;"><span class="source-badge itunes">iTUNES</span> <span style="font-size:0.75rem;color:var(--text-muted);">Searching...</span></div>
            ${TrackRenderer.renderSkeleton(3)}
          </div>
        </div>
      </div>
    `;
    
    // Execute search
    this._doSearch(query);
  },

  async _doSearch(query) {
    const container = document.getElementById('page-container');
    
    try {
      Store.state.searchLoading = true;
      const data = await API.search(query);
      
      if (!data) return; // Aborted
      
      Store.state.searchResults = data.tracks || [];
      Store.state.searchProviders = data.providers || {};
      Store.state.searchLoading = false;
      
      // Save to history
      Store.addToSearchHistory(query);
      
      // Calculate provider stats
      const providerEntries = Object.entries(data.providers || {});
      const successfulProviders = providerEntries.filter(([, v]) => v.status === 'ok' && v.tracks > 0);
      const failedProviders = providerEntries.filter(([, v]) => v.status !== 'ok');
      
      // Render results
      container.innerHTML = `
        <div class="search-page">
          <div class="search-page-header">
            <h2 class="text-title">Results for "${Utils.escapeHtml(query)}"</h2>
            <p style="color:var(--text-muted);font-size:0.875rem;margin-top:4px;">
              ${data.tracks?.length || 0} tracks from ${successfulProviders.length} source${successfulProviders.length !== 1 ? 's' : ''}
              ${failedProviders.length > 0 ? ` · ${failedProviders.length} unavailable` : ''}
            </p>
          </div>
          ${TrackRenderer.renderSearchResults(data)}
        </div>
      `;
      
      // Attach event listeners
      this._attachTrackListeners(container);
      
    } catch (err) {
      if (err.name === 'AbortError') return;
      console.error('Search error:', err);
      Store.state.searchLoading = false;
      
      container.innerHTML = `
        <div class="search-page">
          <div class="search-state">
            <div class="search-state-icon">
              <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><line x1="15" x2="9" y1="9" y2="15"/><line x1="9" x2="15" y1="9" y2="15"/></svg>
            </div>
            <h3>Search failed</h3>
            <p>Something went wrong. Please try again.</p>
            <button class="btn btn-primary" onclick="Router.doSearch('${Utils.escapeHtml(query)}')">Retry</button>
          </div>
        </div>
      `;
    }
  },

  // ===== LIBRARY PAGE =====
  renderLibrary(tab = 'favorites') {
    const container = document.getElementById('page-container');
    
    const tabs = [
      { id: 'favorites', label: 'Favorites', count: Store.state.favorites.length },
      { id: 'recent', label: 'Recently Played', count: Store.state.recentlyPlayed.length }
    ];
    
    let content = '';
    
    if (tab === 'favorites') {
      content = TrackRenderer.renderTrackList(Store.state.favorites, {
        emptyTitle: 'No favorites yet',
        emptyText: 'Heart a track to save it here.',
        showPlaylistAdd: true
      });
    } else if (tab === 'recent') {
      content = TrackRenderer.renderTrackList(Store.state.recentlyPlayed, {
        emptyTitle: 'No recently played tracks',
        emptyText: 'Play some music to see your history here.'
      });
    }
    
    container.innerHTML = `
      <div class="library-page">
        <h1 class="text-title" style="margin-bottom:var(--space-6);">Library</h1>
        
        <div class="library-tabs">
          ${tabs.map(t => `
            <button class="library-tab ${t.id === tab ? 'active' : ''}" data-tab="${t.id}">
              ${t.label} ${t.count > 0 ? `<span class="badge" style="margin-left:4px;">${t.count}</span>` : ''}
            </button>
          `).join('')}
        </div>
        
        <div class="library-content">
          ${content}
        </div>
        
        <div style="margin-top:var(--space-8);display:flex;gap:var(--space-3);">
          <button class="btn btn-secondary" id="btn-export-library">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
            Export Library
          </button>
          <label class="btn btn-secondary" style="cursor:pointer;">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
            Import Library
            <input type="file" accept=".json" id="import-file" style="display:none;">
          </label>
        </div>
      </div>
    `;
    
    // Tab clicks
    container.querySelectorAll('.library-tab').forEach(el => {
      el.addEventListener('click', () => this.renderLibrary(el.dataset.tab));
    });
    
    // Track listeners
    this._attachTrackListeners(container);
    
    // Export
    container.querySelector('#btn-export-library')?.addEventListener('click', () => {
      const json = Store.exportLibrary();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `resonance-library-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      Utils.showToast('Library exported', 'success');
    });
    
    // Import
    container.querySelector('#import-file')?.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = () => {
        const result = Store.importLibrary(reader.result);
        if (result.success) {
          Utils.showToast(`Imported ${result.imported.favorites} favorites and ${result.imported.playlists} playlists`, 'success');
          this.renderLibrary(tab);
        } else {
          Utils.showToast(`Import failed: ${result.error}`, 'error');
        }
      };
      reader.readAsText(file);
    });
  },

  // ===== PLAYLISTS PAGE =====
  renderPlaylists(playlistId = null) {
    const container = document.getElementById('page-container');
    
    if (playlistId) {
      this._renderPlaylistDetail(container, playlistId);
      return;
    }
    
    const playlists = Store.state.playlists;
    
    container.innerHTML = `
      <div class="playlists-page">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-6);">
          <h1 class="text-title">Playlists</h1>
          <button class="btn btn-primary" id="btn-create-playlist">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" x2="12" y1="5" y2="19"/><line x1="5" x2="19" y1="12" y2="12"/></svg>
            New Playlist
          </button>
        </div>
        
        ${playlists.length === 0 ? `
          <div class="empty-state">
            <div class="empty-state-icon">
              <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15V6"/><path d="M18.5 18a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z"/><path d="M12 12H3"/><path d="M16 6H3"/><path d="M12 18H3"/></svg>
            </div>
            <h3>No playlists yet</h3>
            <p>Create a playlist to organize your favorite tracks.</p>
          </div>
        ` : `
          <div class="cards-grid cards-grid-large">
            ${playlists.map(p => `
              <div class="card" data-playlist-id="${p.id}" style="cursor:pointer;">
                <div class="card-artwork">
                  <div class="playlist-artwork-grid" style="width:100%;height:100%;aspect-ratio:1;">
                    ${p.tracks.slice(0, 4).map(t => Utils.artworkHtml(t.artwork || t.artworkSmall, 100, t.title)).join('')}
                    ${Array(Math.max(0, 4 - p.tracks.length)).fill(`
                      <div class="artwork-placeholder" style="background:var(--surface-hover);">
                        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
                      </div>
                    `).join('')}
                  </div>
                  <button class="card-play-btn" data-action="play-playlist" aria-label="Play playlist">
                    <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                  </button>
                </div>
                <div class="card-info">
                  <div class="card-title">${Utils.escapeHtml(p.name)}</div>
                  <div class="card-subtitle">${p.tracks.length} track${p.tracks.length !== 1 ? 's' : ''}</div>
                </div>
              </div>
            `).join('')}
          </div>
        `}
      </div>
    `;
    
    // Create playlist
    container.querySelector('#btn-create-playlist')?.addEventListener('click', () => {
      const name = prompt('Playlist name:');
      if (name?.trim()) {
        Store.createPlaylist(name.trim());
        this.renderPlaylists();
      }
    });
    
    // Playlist click
    container.querySelectorAll('[data-playlist-id]').forEach(el => {
      el.addEventListener('click', (e) => {
        if (e.target.closest('[data-action]')) {
          // Play playlist
          const playlist = Store.state.playlists.find(p => p.id === el.dataset.playlistId);
          if (playlist?.tracks.length > 0) {
            Player.playPlaylist(playlist);
          }
          return;
        }
        this.renderPlaylists(el.dataset.playlistId);
      });
    });
  },

  _renderPlaylistDetail(container, playlistId) {
    const playlist = Store.state.playlists.find(p => p.id === playlistId);
    if (!playlist) {
      this.renderPlaylists();
      return;
    }
    
    container.innerHTML = `
      <div class="playlist-detail-page">
        <button class="btn btn-ghost" onclick="Pages.renderPlaylists()" style="margin-bottom:var(--space-4);">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
          Back to Playlists
        </button>
        
        <div class="playlist-header">
          <div class="playlist-artwork-grid">
            ${playlist.tracks.slice(0, 4).map(t => Utils.artworkHtml(t.artwork || t.artworkSmall, 200, t.title)).join('')}
            ${Array(Math.max(0, 4 - playlist.tracks.length)).fill(`
              <div class="artwork-placeholder" style="background:var(--surface-hover);">
                <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
              </div>
            `).join('')}
          </div>
          <div class="playlist-details">
            <h1>${Utils.escapeHtml(playlist.name)}</h1>
            <p class="playlist-meta">${playlist.tracks.length} track${playlist.tracks.length !== 1 ? 's' : ''} · Updated ${Utils.timeAgo(playlist.updatedAt)}</p>
            <div class="playlist-actions">
              <button class="btn btn-primary" id="play-playlist" ${playlist.tracks.length === 0 ? 'disabled' : ''}>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                Play
              </button>
              <button class="btn btn-secondary" id="shuffle-playlist" ${playlist.tracks.length === 0 ? 'disabled' : ''}>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 3 21 3 21 8"/><line x1="4" x2="21" y1="20" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" x2="21" y1="15" y2="21"/><line x1="4" x2="9" y1="20" y2="15"/></svg>
                Shuffle
              </button>
              <button class="btn btn-ghost" id="rename-playlist">Rename</button>
              <button class="btn btn-ghost text-danger" id="delete-playlist">Delete</button>
            </div>
          </div>
        </div>
        
        <div class="playlist-tracks">
          ${TrackRenderer.renderTrackList(playlist.tracks, {
            emptyTitle: 'Empty playlist',
            emptyText: 'Search for music and add tracks to this playlist.',
            showPlaylistAdd: false
          })}
        </div>
      </div>
    `;
    
    // Play
    container.querySelector('#play-playlist')?.addEventListener('click', () => {
      Player.playPlaylist(playlist);
    });
    
    // Shuffle
    container.querySelector('#shuffle-playlist')?.addEventListener('click', () => {
      Player.playPlaylist(playlist, true);
    });
    
    // Rename
    container.querySelector('#rename-playlist')?.addEventListener('click', () => {
      const name = prompt('New name:', playlist.name);
      if (name?.trim()) {
        Store.renamePlaylist(playlistId, name.trim());
        this._renderPlaylistDetail(container, playlistId);
      }
    });
    
    // Delete
    container.querySelector('#delete-playlist')?.addEventListener('click', () => {
      if (confirm(`Delete "${playlist.name}"?`)) {
        Store.deletePlaylist(playlistId);
        this.renderPlaylists();
      }
    });
    
    // Track listeners (with remove from playlist)
    container.querySelectorAll('.track-item').forEach(el => {
      el.addEventListener('click', (e) => {
        const trackId = el.dataset.trackId;
        const track = playlist.tracks.find(t => t.id === trackId);
        if (!track) return;
        
        const action = e.target.closest('[data-action]')?.dataset.action;
        if (action === 'favorite') {
          Store.toggleFavorite(track);
        } else if (action === 'queue') {
          Store.addToQueue(track);
        } else {
          Player.play(track);
        }
      });
    });
  },

  // ===== SETTINGS PAGE =====
  renderSettings() {
    const container = document.getElementById('page-container');
    const s = Store.state;
    
    container.innerHTML = `
      <div class="settings-page">
        <h1 class="text-title" style="margin-bottom:var(--space-8);">Settings</h1>
        
        <!-- Appearance -->
        <div class="settings-section">
          <h3>Appearance</h3>
          <div class="setting-row">
            <div>
              <div class="setting-label">Theme</div>
            </div>
            <div class="theme-options">
              <button class="theme-option ${s.theme === 'dark' ? 'active' : ''}" data-theme="dark">Dark</button>
              <button class="theme-option ${s.theme === 'light' ? 'active' : ''}" data-theme="light">Light</button>
              <button class="theme-option ${s.theme === 'amoled' ? 'active' : ''}" data-theme="amoled">AMOLED</button>
            </div>
          </div>
          
          <div class="setting-row">
            <div>
              <div class="setting-label">Accent Color</div>
            </div>
            <div class="accent-options">
              ${(() => {
                const colors = {
                  violet: '#8B5CF6', indigo: '#6366F1', blue: '#3B82F6', sky: '#0EA5E9',
                  cyan: '#06B6D4', teal: '#14B8A6', emerald: '#10B981', green: '#22C55E',
                  lime: '#84CC16', yellow: '#EAB308', amber: '#F59E0B', orange: '#F97316',
                  red: '#EF4444', rose: '#F43F5E', pink: '#EC4899', fuchsia: '#D946EF',
                  coral: '#FB7185', slate: '#94A3B8'
                };
                return Object.entries(colors).map(([name, hex]) =>
                  `<button class="accent-option ${s.accent === name ? 'active' : ''}" data-accent="${name}" style="background:${hex};" title="${name}"></button>`
                ).join('');
              })()}
            </div>
          </div>
        </div>
        
        <!-- Music Atmosphere -->
        <div class="settings-section">
          <h3>Music Atmosphere</h3>
          <div class="setting-row">
            <div>
              <div class="setting-label">Ambient Background</div>
              <div class="setting-description">Soft colored orbs that respond to the current track</div>
            </div>
            <button class="toggle ${s.ambientMode ? 'active' : ''}" id="toggle-ambient"></button>
          </div>
          <div class="setting-row">
            <div>
              <div class="setting-label">Visualizer</div>
              <div class="setting-description">Audio visualization mode</div>
            </div>
            <div class="theme-options">
              ${['ambient', 'wave', 'spectrum', 'pulse', 'minimal', 'off'].map(mode => `
                <button class="theme-option ${s.visualizerMode === mode ? 'active' : ''}" data-visualizer="${mode}" style="font-size:0.8125rem;padding:6px 12px;">${mode.charAt(0).toUpperCase() + mode.slice(1)}</button>
              `).join('')}
            </div>
          </div>
        </div>
        
        <!-- Player -->
        <div class="settings-section">
          <h3>Player</h3>
          <div class="setting-row">
            <div>
              <div class="setting-label">Volume</div>
            </div>
            <div style="display:flex;align-items:center;gap:var(--space-3);width:200px;">
              <input type="range" class="volume-slider" id="settings-volume" min="0" max="100" value="${s.volume}" style="flex:1;background-size:${s.volume}% 100%;">
              <span style="font-size:0.875rem;color:var(--text-muted);width:36px;text-align:right;">${s.volume}%</span>
            </div>
          </div>
          <div class="setting-row">
            <div>
              <div class="setting-label">Compact Mode</div>
              <div class="setting-description">Show more results per screen</div>
            </div>
            <button class="toggle ${s.compactMode ? 'active' : ''}" id="toggle-compact"></button>
          </div>
        </div>
        
        <!-- Data -->
        <div class="settings-section">
          <h3>Data & Storage</h3>
          <div class="setting-row">
            <div>
              <div class="setting-label">Library Data</div>
              <div class="setting-description">${s.favorites.length} favorites · ${s.playlists.length} playlists · ${s.recentlyPlayed.length} recent tracks</div>
            </div>
            <button class="btn btn-ghost text-danger" id="btn-clear-data">Clear All Data</button>
          </div>
        </div>
        
        <!-- About -->
        <div class="settings-section">
          <h3>About</h3>
          <div class="setting-row">
            <div>
              <div class="setting-label">Resonance Music Explorer</div>
              <div class="setting-description">Multi-source music discovery. Searches iTunes, Deezer, Audius, Jamendo, and YouTube.</div>
            </div>
          </div>
        </div>
      </div>
    `;
    
    // Theme buttons
    container.querySelectorAll('[data-theme]').forEach(btn => {
      btn.addEventListener('click', () => {
        Store.state.theme = btn.dataset.theme;
        document.documentElement.setAttribute('data-theme', btn.dataset.theme);
        Store.saveSettings();
        this.renderSettings();
      });
    });
    
    // Accent buttons
    container.querySelectorAll('[data-accent]').forEach(btn => {
      btn.addEventListener('click', () => {
        Store.state.accent = btn.dataset.accent;
        Store.applyAccent(btn.dataset.accent);
        Store.saveSettings();
        this.renderSettings();
      });
    });
    
    // Visualizer mode
    container.querySelectorAll('[data-visualizer]').forEach(btn => {
      btn.addEventListener('click', () => {
        Store.state.visualizerMode = btn.dataset.visualizer;
        Visualizer.setMode(btn.dataset.visualizer);
        Store.saveSettings();
        this.renderSettings();
      });
    });
    
    // Ambient toggle
    container.querySelector('#toggle-ambient')?.addEventListener('click', function() {
      Store.state.ambientMode = !Store.state.ambientMode;
      this.classList.toggle('active');
      document.getElementById('ambient-bg').classList.toggle('active', Store.state.ambientMode);
      Store.saveSettings();
    });
    
    // Compact toggle
    container.querySelector('#toggle-compact')?.addEventListener('click', function() {
      Store.state.compactMode = !Store.state.compactMode;
      this.classList.toggle('active');
      Store.saveSettings();
    });
    
    // Volume
    container.querySelector('#settings-volume')?.addEventListener('input', function() {
      Store.state.volume = parseInt(this.value);
      Player.setVolume(Store.state.volume);
      this.nextElementSibling.textContent = Store.state.volume + '%';
      this.style.backgroundSize = Store.state.volume + '% 100%';
      Store.saveSettings();
    });
    
    // Clear data
    container.querySelector('#btn-clear-data')?.addEventListener('click', () => {
      if (confirm('This will remove all favorites, playlists, and history. Continue?')) {
        Store.state.favorites = [];
        Store.state.playlists = [];
        Store.state.recentlyPlayed = [];
        Store.state.queue = [];
        Store.save(Store.KEYS.FAVORITES, []);
        Store.save(Store.KEYS.PLAYLISTS, []);
        Store.save(Store.KEYS.RECENT, []);
        Store.saveQueue();
        Utils.showToast('All data cleared', 'info');
        this.renderSettings();
      }
    });
  },

  // ===== ATTACH TRACK LISTENERS =====
  _attachTrackListeners(container) {
    container.querySelectorAll('.track-item').forEach(el => {
      el.addEventListener('click', (e) => {
        const trackId = el.dataset.trackId;
        const track = TrackDataStore.get(trackId) ||
                      Store.state.searchResults.find(t => t.id === trackId) ||
                      Store.state.recentlyPlayed.find(t => t.id === trackId) ||
                      Store.state.favorites.find(t => t.id === trackId);
        if (track) {
          TrackRenderer.handleTrackAction(e, track);
        }
      });
    });
    
    // Card clicks
    container.querySelectorAll('.card[data-track-id]').forEach(el => {
      el.addEventListener('click', (e) => {
        const trackId = el.dataset.trackId;
        const track = TrackDataStore.get(trackId);
        if (track) {
          Player.play(track);
        }
      });
    });
  }
};
// ===== TRACK RENDERING COMPONENTS =====

// Global track store for safe data access
const TrackDataStore = {
  _tracks: new Map(),
  
  set(trackId, track) {
    this._tracks.set(trackId, track);
  },
  
  get(trackId) {
    return this._tracks.get(trackId);
  },
  
  clear() {
    this._tracks.clear();
  }
};

const TrackRenderer = {
  // Render a single track item
  renderTrack(track, options = {}) {
    // Store track data safely
    TrackDataStore.set(track.id, track);
    
    const isPlaying = Store.state.currentTrack?.id === track.id;
    const isFav = Store.isFavorite(track.id);
    const showActions = options.showActions !== false;
    const showMeta = options.showMeta !== false;
    const showSource = options.showSource !== false;
    
    return `
      <div class="track-item ${isPlaying ? 'playing' : ''}" data-track-id="${track.id}">
        <div class="track-artwork">
          ${Utils.artworkHtml(track.artworkSmall || track.artwork, 48, track.title)}
          <div class="play-overlay">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          </div>
        </div>
        <div class="track-info">
          <div class="track-title">${Utils.escapeHtml(track.title)}</div>
          <div class="track-artist">${Utils.escapeHtml(track.artist)}</div>
        </div>
        ${showMeta ? `
        <div class="track-meta">
          ${showSource ? Utils.sourceBadge(track.provider) : ''}
          ${Utils.trackTypeBadge(track.playbackType)}
          <span class="track-duration">${Utils.formatTime(track.duration)}</span>
        </div>
        ` : ''}
        ${showActions ? `
        <div class="track-actions">
          <button class="track-action-btn ${isFav ? 'favorited' : ''}" data-action="favorite" title="Favorite">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="${isFav ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
          </button>
          <button class="track-action-btn" data-action="queue" title="Add to queue">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 12H3"/><path d="M16 6H3"/><path d="M12 18H3"/><path d="M21 15V6"/><path d="M18.5 18a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z"/></svg>
          </button>
          <button class="track-action-btn" data-action="playnext" title="Play next">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 4 15 12 5 20 5 4"/><line x1="19" x2="19" y1="5" y2="19"/></svg>
          </button>
          ${options.showPlaylistAdd ? `
          <button class="track-action-btn" data-action="add-to-playlist" title="Add to playlist">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" x2="12" y1="5" y2="19"/><line x1="5" x2="19" y1="12" y2="12"/></svg>
          </button>
          ` : ''}
        </div>
        ` : ''}
      </div>
    `;
  },

  // Render track list
  renderTrackList(tracks, options = {}) {
    if (!tracks || tracks.length === 0) {
      return `
        <div class="empty-state">
          <div class="empty-state-icon">
            <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
          </div>
          <h3>${options.emptyTitle || 'No tracks'}</h3>
          <p>${options.emptyText || ''}</p>
        </div>
      `;
    }
    
    return `<div class="track-list">${tracks.map(t => this.renderTrack(t, options)).join('')}</div>`;
  },

  // Render card
  renderCard(track, options = {}) {
    TrackDataStore.set(track.id, track);
    
    return `
      <div class="card h-scroll-item" data-track-id="${track.id}">
        <div class="card-artwork">
          ${Utils.artworkHtml(track.artwork || track.artworkSmall, 200, track.title)}
          <button class="card-play-btn" data-action="play" aria-label="Play ${Utils.escapeHtml(track.title)}">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          </button>
        </div>
        <div class="card-info">
          <div class="card-title">${Utils.escapeHtml(track.title)}</div>
          <div class="card-subtitle">${Utils.escapeHtml(track.artist)}</div>
        </div>
      </div>
    `;
  },

  // Render cards grid
  renderCardsGrid(tracks, options = {}) {
    if (!tracks || tracks.length === 0) return '';
    return `<div class="cards-grid ${options.large ? 'cards-grid-large' : ''}">
      ${tracks.map(t => this.renderCard(t, options)).join('')}
    </div>`;
  },

  // Render horizontal scroll
  renderHScroll(tracks, options = {}) {
    if (!tracks || tracks.length === 0) return '';
    return `<div class="h-scroll">${tracks.map(t => this.renderCard(t, options)).join('')}</div>`;
  },

  // Render skeleton loading
  renderSkeleton(count = 5) {
    return Array(count).fill(`
      <div class="skeleton-track">
        <div class="skeleton skeleton-artwork"></div>
        <div style="flex:1;display:flex;flex-direction:column;gap:8px;">
          <div class="skeleton skeleton-text w-48" style="height:14px;"></div>
          <div class="skeleton skeleton-text w-32" style="height:12px;"></div>
        </div>
      </div>
    `).join('');
  },

  // Handle track click actions
  handleTrackAction(e, track) {
    const action = e.target.closest('[data-action]')?.dataset.action;
    
    if (!action) {
      // Default: play the track
      Player.play(track);
      return;
    }
    
    switch (action) {
      case 'play':
        Player.play(track);
        break;
      case 'favorite':
        e.stopPropagation();
        Store.toggleFavorite(track);
        // Update UI
        const btn = e.target.closest('.track-action-btn');
        if (btn) {
          const isFav = Store.isFavorite(track.id);
          btn.classList.toggle('favorited', isFav);
          const svg = btn.querySelector('svg');
          if (svg) svg.setAttribute('fill', isFav ? 'currentColor' : 'none');
        }
        break;
      case 'queue':
        e.stopPropagation();
        Store.addToQueue(track);
        break;
      case 'playnext':
        e.stopPropagation();
        Store.playNext(track);
        break;
      case 'add-to-playlist':
        e.stopPropagation();
        this.showPlaylistPicker(track);
        break;
    }
  },

  // Show playlist picker
  showPlaylistPicker(track) {
    const playlists = Store.state.playlists;
    if (playlists.length === 0) {
      const p = Store.createPlaylist('My Playlist');
      Store.addToPlaylist(p.id, track);
      return;
    }
    
    // Simple picker using first playlist for now
    // Full implementation would use a modal
    if (playlists.length === 1) {
      Store.addToPlaylist(playlists[0].id, track);
    } else {
      Store.addToPlaylist(playlists[0].id, track);
    }
  },

  // Render search results
  renderSearchResults(data) {
    if (!data) return '';
    
    const { tracks, providers } = data;
    
    if (!tracks || tracks.length === 0) {
      return `
        <div class="search-state">
          <div class="search-state-icon">
            <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          </div>
          <h3>No results found</h3>
          <p>Try a different search term or check which sources are available.</p>
        </div>
      `;
    }
    
    // Provider status summary with better visual feedback
    let statusHtml = '';
    if (providers && Object.keys(providers).length > 0) {
      const statusItems = Object.entries(providers).map(([name, info]) => {
        const statusClass = info.status === 'ok' ? 'available' : info.status === 'unconfigured' ? 'unconfigured' : 'unavailable';
        const count = info.tracks || 0;
        
        let label = '';
        if (statusClass === 'available') {
          label = `✓ ${name.toUpperCase()}`;
          if (count > 0) label += ` <span style="opacity:0.7;">(${count})</span>`;
        } else if (statusClass === 'unconfigured') {
          label = `⚙ ${name.toUpperCase()} — Setup required`;
        } else {
          label = `✗ ${name.toUpperCase()} — Unavailable`;
        }
        
        return `<span class="provider-pill ${statusClass === 'available' ? 'active' : ''}" style="opacity:${statusClass === 'available' ? 1 : 0.5}" title="${info.error || ''}">
          <span class="provider-dot ${statusClass}" style="width:6px;height:6px;display:inline-block;border-radius:50%;margin-right:4px;"></span>
          ${label}
        </span>`;
      });
      statusHtml = `<div class="provider-filters">${statusItems.join('')}</div>`;
    }
    
    return `
      ${statusHtml}
      <div class="track-list" style="margin-top:var(--space-4);">
        ${tracks.map(t => this.renderTrack(t)).join('')}
      </div>
    `;
  }
};
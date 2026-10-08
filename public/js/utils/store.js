// ===== APPLICATION STATE STORE =====

const Store = {
  // State
  state: {
    // Current page
    currentPage: 'discover',
    
    // Search
    searchQuery: '',
    searchResults: [],
    searchProviders: {},
    searchLoading: false,
    searchError: null,
    
    // Player
    currentTrack: null,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 80,
    isMuted: false,
    shuffle: false,
    repeat: 'off', // off, all, one
    
    // Queue
    queue: [],
    queueIndex: -1,
    showQueue: false,
    
    // Library
    favorites: [],
    playlists: [],
    recentlyPlayed: [],
    
    // UI
    theme: 'dark',
    accent: 'violet',
    ambientMode: true,
    visualizerMode: 'ambient', // ambient, wave, spectrum, pulse, minimal, off
    showFullPlayer: false,
    compactMode: false,
    
    // Sleep timer
    sleepTimer: null,
    sleepTimerEnd: null,
    
    // Provider health
    providerHealth: {}
  },

  // Persistence keys
  KEYS: {
    FAVORITES: 'resonance_favorites',
    PLAYLISTS: 'resonance_playlists',
    RECENT: 'resonance_recent',
    QUEUE: 'resonance_queue',
    SETTINGS: 'resonance_settings',
    SEARCH_HISTORY: 'resonance_search_history'
  },

  // Initialize from localStorage
  init() {
    try {
      // Load settings
      const settings = this.load(this.KEYS.SETTINGS);
      if (settings) {
        this.state.theme = settings.theme || 'dark';
        this.state.accent = settings.accent || 'violet';
        this.state.ambientMode = settings.ambientMode !== false;
        this.state.visualizerMode = settings.visualizerMode || 'ambient';
        this.state.volume = settings.volume ?? 80;
        this.state.compactMode = settings.compactMode || false;
      }

      // Load favorites
      this.state.favorites = this.load(this.KEYS.FAVORITES) || [];
      
      // Load playlists
      this.state.playlists = this.load(this.KEYS.PLAYLISTS) || [];
      
      // Load recently played
      this.state.recentlyPlayed = this.load(this.KEYS.RECENT) || [];
      
      // Load queue
      const savedQueue = this.load(this.KEYS.QUEUE);
      if (savedQueue) {
        this.state.queue = savedQueue.queue || [];
        this.state.queueIndex = savedQueue.index ?? -1;
      }

      // Apply theme
      document.documentElement.setAttribute('data-theme', this.state.theme);
      this.applyAccent(this.state.accent);
      
    } catch (err) {
      console.warn('Store init error:', err);
    }
  },

  // Load from localStorage with error handling
  load(key) {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  // Save to localStorage
  save(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (err) {
      console.warn('Storage save error:', err);
    }
  },

  // Save settings
  saveSettings() {
    this.save(this.KEYS.SETTINGS, {
      theme: this.state.theme,
      accent: this.state.accent,
      ambientMode: this.state.ambientMode,
      visualizerMode: this.state.visualizerMode,
      volume: this.state.volume,
      compactMode: this.state.compactMode
    });
  },

  // Save queue
  saveQueue() {
    this.save(this.KEYS.QUEUE, {
      queue: this.state.queue,
      index: this.state.queueIndex
    });
  },

  // Favorites
  isFavorite(trackId) {
    return this.state.favorites.some(t => t.id === trackId);
  },

  toggleFavorite(track) {
    const idx = this.state.favorites.findIndex(t => t.id === track.id);
    if (idx >= 0) {
      this.state.favorites.splice(idx, 1);
      Utils.showToast('Removed from favorites', 'info');
    } else {
      this.state.favorites.unshift({ ...track, addedAt: Date.now() });
      Utils.showToast('Added to favorites', 'success');
    }
    this.save(this.KEYS.FAVORITES, this.state.favorites);
    Utils.emit('favorites-changed');
  },

  // Recently played
  addToRecent(track) {
    // Remove existing entry
    this.state.recentlyPlayed = this.state.recentlyPlayed.filter(t => t.id !== track.id);
    // Add to front
    this.state.recentlyPlayed.unshift({ ...track, playedAt: Date.now() });
    // Keep last 50
    if (this.state.recentlyPlayed.length > 50) {
      this.state.recentlyPlayed = this.state.recentlyPlayed.slice(0, 50);
    }
    this.save(this.KEYS.RECENT, this.state.recentlyPlayed);
    Utils.emit('recent-changed');
  },

  // Queue management
  addToQueue(track) {
    this.state.queue.push({ ...track, queueId: Utils.uid() });
    this.saveQueue();
    Utils.emit('queue-changed');
    Utils.showToast('Added to queue', 'success');
  },

  playNext(track) {
    const insertAt = this.state.queueIndex >= 0 ? this.state.queueIndex + 1 : 0;
    this.state.queue.splice(insertAt, 0, { ...track, queueId: Utils.uid() });
    this.saveQueue();
    Utils.emit('queue-changed');
    Utils.showToast('Playing next', 'success');
  },

  removeFromQueue(queueId) {
    const idx = this.state.queue.findIndex(t => t.queueId === queueId);
    if (idx >= 0) {
      // Adjust current index if needed
      if (idx < this.state.queueIndex) this.state.queueIndex--;
      else if (idx === this.state.queueIndex) this.state.queueIndex--;
      this.state.queue.splice(idx, 1);
      this.saveQueue();
      Utils.emit('queue-changed');
    }
  },

  clearQueue() {
    this.state.queue = [];
    this.state.queueIndex = -1;
    this.saveQueue();
    Utils.emit('queue-changed');
  },

  shuffleQueue() {
    // Keep current track, shuffle the rest
    const current = this.state.queue[this.state.queueIndex];
    const rest = this.state.queue.filter((_, i) => i !== this.state.queueIndex);
    for (let i = rest.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [rest[i], rest[j]] = [rest[j], rest[i]];
    }
    this.state.queue = current ? [current, ...rest] : rest;
    this.state.queueIndex = current ? 0 : -1;
    this.saveQueue();
    Utils.emit('queue-changed');
  },

  // Playlists
  createPlaylist(name) {
    const playlist = {
      id: Utils.uid(),
      name: name || 'New Playlist',
      tracks: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    this.state.playlists.push(playlist);
    this.save(this.KEYS.PLAYLISTS, this.state.playlists);
    Utils.emit('playlists-changed');
    return playlist;
  },

  deletePlaylist(playlistId) {
    this.state.playlists = this.state.playlists.filter(p => p.id !== playlistId);
    this.save(this.KEYS.PLAYLISTS, this.state.playlists);
    Utils.emit('playlists-changed');
  },

  renamePlaylist(playlistId, newName) {
    const p = this.state.playlists.find(p => p.id === playlistId);
    if (p) {
      p.name = newName;
      p.updatedAt = Date.now();
      this.save(this.KEYS.PLAYLISTS, this.state.playlists);
      Utils.emit('playlists-changed');
    }
  },

  addToPlaylist(playlistId, track) {
    const p = this.state.playlists.find(p => p.id === playlistId);
    if (p && !p.tracks.some(t => t.id === track.id)) {
      p.tracks.push({ ...track, addedAt: Date.now() });
      p.updatedAt = Date.now();
      this.save(this.KEYS.PLAYLISTS, this.state.playlists);
      Utils.emit('playlists-changed');
      Utils.showToast(`Added to ${p.name}`, 'success');
    }
  },

  removeFromPlaylist(playlistId, trackId) {
    const p = this.state.playlists.find(p => p.id === playlistId);
    if (p) {
      p.tracks = p.tracks.filter(t => t.id !== trackId);
      p.updatedAt = Date.now();
      this.save(this.KEYS.PLAYLISTS, this.state.playlists);
      Utils.emit('playlists-changed');
    }
  },

  // Accent color
  applyAccent(accentName) {
    const accents = {
      violet:  { primary: '#8B5CF6', secondary: '#7C3AED', tertiary: '#6D28D9' },
      indigo:  { primary: '#6366F1', secondary: '#4F46E5', tertiary: '#4338CA' },
      blue:    { primary: '#3B82F6', secondary: '#2563EB', tertiary: '#1D4ED8' },
      sky:     { primary: '#0EA5E9', secondary: '#0284C7', tertiary: '#0369A1' },
      cyan:    { primary: '#06B6D4', secondary: '#0891B2', tertiary: '#0E7490' },
      teal:    { primary: '#14B8A6', secondary: '#0D9488', tertiary: '#0F766E' },
      emerald: { primary: '#10B981', secondary: '#059669', tertiary: '#047857' },
      green:   { primary: '#22C55E', secondary: '#16A34A', tertiary: '#15803D' },
      lime:    { primary: '#84CC16', secondary: '#65A30D', tertiary: '#4D7C0F' },
      yellow:  { primary: '#EAB308', secondary: '#CA8A04', tertiary: '#A16207' },
      amber:   { primary: '#F59E0B', secondary: '#D97706', tertiary: '#B45309' },
      orange:  { primary: '#F97316', secondary: '#EA580C', tertiary: '#C2410C' },
      red:     { primary: '#EF4444', secondary: '#DC2626', tertiary: '#B91C1C' },
      rose:    { primary: '#F43F5E', secondary: '#E11D48', tertiary: '#BE123C' },
      pink:    { primary: '#EC4899', secondary: '#DB2777', tertiary: '#BE185D' },
      fuchsia: { primary: '#D946EF', secondary: '#C026D3', tertiary: '#A21CAF' },
      coral:   { primary: '#FB7185', secondary: '#F43F5E', tertiary: '#E11D48' },
      slate:   { primary: '#94A3B8', secondary: '#64748B', tertiary: '#475569' }
    };
    
    const a = accents[accentName] || accents.violet;
    document.documentElement.style.setProperty('--accent', a.primary);
    document.documentElement.style.setProperty('--accent-hover', a.secondary);
    document.documentElement.style.setProperty('--accent-soft', a.primary + '26');
    document.documentElement.style.setProperty('--accent-softer', a.primary + '14');
    document.documentElement.style.setProperty('--accent-glow', a.primary + '4D');
  },

  // Export library
  exportLibrary() {
    return JSON.stringify({
      version: 1,
      exportedAt: Date.now(),
      favorites: this.state.favorites,
      playlists: this.state.playlists,
      recentlyPlayed: this.state.recentlyPlayed
    }, null, 2);
  },

  // Import library
  importLibrary(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      if (!data || data.version !== 1) {
        throw new Error('Invalid format');
      }
      
      // Validate and merge
      if (Array.isArray(data.favorites)) {
        for (const track of data.favorites) {
          if (track.id && track.title && track.provider) {
            if (!this.state.favorites.some(t => t.id === track.id)) {
              this.state.favorites.push(track);
            }
          }
        }
      }
      
      if (Array.isArray(data.playlists)) {
        for (const playlist of data.playlists) {
          if (playlist.id && playlist.name && Array.isArray(playlist.tracks)) {
            const existing = this.state.playlists.find(p => p.id === playlist.id);
            if (!existing) {
              this.state.playlists.push(playlist);
            }
          }
        }
      }
      
      this.save(this.KEYS.FAVORITES, this.state.favorites);
      this.save(this.KEYS.PLAYLISTS, this.state.playlists);
      Utils.emit('favorites-changed');
      Utils.emit('playlists-changed');
      
      return { success: true, imported: { favorites: data.favorites?.length || 0, playlists: data.playlists?.length || 0 } };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  // Search history
  getSearchHistory() {
    return this.load(this.KEYS.SEARCH_HISTORY) || [];
  },

  addToSearchHistory(query) {
    let history = this.getSearchHistory();
    history = history.filter(q => q !== query);
    history.unshift(query);
    if (history.length > 20) history = history.slice(0, 20);
    this.save(this.KEYS.SEARCH_HISTORY, history);
  }
};
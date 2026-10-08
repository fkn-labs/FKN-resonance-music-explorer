// ===== UNIFIED PLAYER =====

const Player = {
  audio: null,
  ytPlayer: null,
  ytReady: false,
  isYouTubePlaying: false,
  _progressInterval: null,
  _sleepTimeout: null,
  _sleepEndTimeout: null,

  init() {
    this.audio = document.getElementById('audio-player');
    
    // Audio events
    this.audio.addEventListener('play', () => this._onPlay());
    this.audio.addEventListener('pause', () => this._onPause());
    this.audio.addEventListener('ended', () => this._onEnded());
    this.audio.addEventListener('timeupdate', () => this._onTimeUpdate());
    this.audio.addEventListener('loadedmetadata', () => this._onMetadataLoaded());
    this.audio.addEventListener('error', (e) => this._onError(e));
    
    // Set initial volume
    this.audio.volume = Store.state.volume / 100;
    
    // Setup controls
    this._setupMiniPlayerControls();
    this._setupFullPlayerControls();
    this._setupProgressBarInteraction();
    this._setupMediaSession();
    
    // Visualizer — uses time-based animation, never captures the audio element
    Visualizer.init(document.getElementById('visualizer'));
    Visualizer.setMode(Store.state.visualizerMode);
  },

  // ===== PLAY =====
  async play(track) {
    if (!track) return;
    
    // Add to recently played
    Store.addToRecent(track);
    
    // Update current track
    Store.state.currentTrack = track;
    Store.state.currentTime = 0;
    Store.state.duration = track.duration || 0;
    
    // Update color theme
    this._updateTheme(track);
    
    // Show mini player
    this._showMiniPlayer();
    this._updatePlayerUI();
    
    // Play based on type
    if (track.provider === 'youtube' && track.videoId) {
      this._playYouTube(track);
    } else if (track.previewUrl || track.fullUrl) {
      this._playAudio(track.fullUrl || track.previewUrl);
    } else {
      Utils.showToast('No playable source for this track', 'error');
      return;
    }
    
    // Update queue position if track is in queue
    const queueIdx = Store.state.queue.findIndex(t => t.id === track.id);
    if (queueIdx >= 0) {
      Store.state.queueIndex = queueIdx;
    }
    
    Utils.emit('track-changed', track);
  },

  _playAudio(url) {
    // Hide YouTube player
    document.getElementById('yt-player-container')?.classList.add('hidden');
    this.isYouTubePlaying = false;
    
    this.audio.src = url;
    this.audio.load();
    this.audio.play().catch(() => {});
    
    Visualizer.start();
  },

  _playYouTube(track) {
    // Pause audio player
    this.audio.pause();
    
    // Show YouTube player
    const container = document.getElementById('yt-player-container');
    container?.classList.remove('hidden');
    
    // Load YouTube IFrame API if needed
    if (!window.YT?.Player) {
      this._loadYouTubeAPI(track);
    } else {
      this._createYouTubePlayer(track.videoId);
    }
    
    this.isYouTubePlaying = true;
  },

  _loadYouTubeAPI(track) {
    if (document.getElementById('yt-iframe-api')) {
      // Already loading
      window._ytQueue = window._ytQueue || [];
      window._ytQueue.push(track);
      return;
    }
    
    const tag = document.createElement('script');
    tag.id = 'yt-iframe-api';
    tag.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(tag);
    
    window.onYouTubeIframeAPIReady = () => {
      this.ytReady = true;
      // Play queued track
      if (window._ytQueue?.length) {
        const t = window._ytQueue.pop();
        this._createYouTubePlayer(t.videoId);
      } else if (track) {
        this._createYouTubePlayer(track.videoId);
      }
    };
  },

  _createYouTubePlayer(videoId) {
    if (this.ytPlayer) {
      try {
        this.ytPlayer.loadVideoById(videoId);
      } catch {
        this.ytPlayer = new YT.Player('yt-player', {
          height: '100%',
          width: '100%',
          videoId: videoId,
          playerVars: {
            autoplay: 1,
            controls: 1,
            modestbranding: 1,
            rel: 0
          },
          events: {
            onStateChange: (e) => this._onYTStateChange(e)
          }
        });
      }
    } else {
      this.ytPlayer = new YT.Player('yt-player', {
        height: '100%',
        width: '100%',
        videoId: videoId,
        playerVars: {
          autoplay: 1,
          controls: 1,
          modestbranding: 1,
          rel: 0
        },
        events: {
          onStateChange: (e) => this._onYTStateChange(e)
        }
      });
    }
    
    Store.state.isPlaying = true;
    this._updatePlayButtons();
    this._startProgressSimulation();
  },

  _onYTStateChange(event) {
    if (event.data === YT.PlayerState.ENDED) {
      this._onEnded();
    } else if (event.data === YT.PlayerState.PLAYING) {
      Store.state.isPlaying = true;
      this._updatePlayButtons();
      this._startProgressSimulation();
    } else if (event.data === YT.PlayerState.PAUSED) {
      Store.state.isPlaying = false;
      this._updatePlayButtons();
    }
  },

  _startProgressSimulation() {
    if (this._progressInterval) clearInterval(this._progressInterval);
    this._progressInterval = setInterval(() => {
      if (this.isYouTubePlaying && this.ytPlayer?.getCurrentTime) {
        try {
          Store.state.currentTime = this.ytPlayer.getCurrentTime();
          Store.state.duration = this.ytPlayer.getDuration() || 0;
          this._updateProgress();
        } catch {}
      }
    }, 500);
  },

  // ===== CONTROLS =====
  togglePlay() {
    if (Store.state.isPlaying) {
      this.pause();
    } else {
      this.resume();
    }
  },

  pause() {
    if (this.isYouTubePlaying) {
      try { this.ytPlayer?.pauseVideo(); } catch {}
    } else {
      this.audio.pause();
    }
    Store.state.isPlaying = false;
    this._updatePlayButtons();
  },

  resume() {
    if (this.isYouTubePlaying) {
      try { this.ytPlayer?.playVideo(); } catch {}
    } else {
      this.audio.play().catch(() => {});
    }
    Store.state.isPlaying = true;
    this._updatePlayButtons();
  },

  next() {
    const { queue, queueIndex, shuffle } = Store.state;
    
    if (shuffle) {
      // Random next from queue
      if (queue.length > 1) {
        let idx;
        do { idx = Math.floor(Math.random() * queue.length); } while (idx === queueIndex);
        Store.state.queueIndex = idx;
        this.play(queue[idx]);
      }
      return;
    }
    
    const nextIdx = queueIndex + 1;
    if (nextIdx < queue.length) {
      Store.state.queueIndex = nextIdx;
      this.play(queue[nextIdx]);
    } else if (Store.state.repeat === 'all' && queue.length > 0) {
      Store.state.queueIndex = 0;
      this.play(queue[0]);
    } else {
      this.stop();
    }
  },

  previous() {
    const { queue, queueIndex, currentTime } = Store.state;
    
    // If more than 3 seconds in, restart current track
    if (currentTime > 3) {
      this.seekTo(0);
      return;
    }
    
    const prevIdx = queueIndex - 1;
    if (prevIdx >= 0) {
      Store.state.queueIndex = prevIdx;
      this.play(queue[prevIdx]);
    } else if (Store.state.repeat === 'all' && queue.length > 0) {
      Store.state.queueIndex = queue.length - 1;
      this.play(queue[queue.length - 1]);
    } else {
      this.seekTo(0);
    }
  },

  stop() {
    this.audio.pause();
    this.audio.currentTime = 0;
    if (this.isYouTubePlaying) {
      try { this.ytPlayer?.stopVideo(); } catch {}
      document.getElementById('yt-player-container')?.classList.add('hidden');
      this.isYouTubePlaying = false;
    }
    if (this._progressInterval) clearInterval(this._progressInterval);
    Store.state.isPlaying = false;
    Store.state.currentTime = 0;
    this._updatePlayButtons();
    this._updateProgress();
  },

  seekTo(seconds) {
    if (this.isYouTubePlaying) {
      try { this.ytPlayer?.seekTo(seconds, true); } catch {}
    } else {
      this.audio.currentTime = seconds;
    }
    Store.state.currentTime = seconds;
    this._updateProgress();
  },

  setVolume(value) {
    const v = Math.max(0, Math.min(100, value));
    Store.state.volume = v;
    this.audio.volume = v / 100;
    if (v === 0) Store.state.isMuted = true;
    else Store.state.isMuted = false;
    this._updateVolumeUI();
    Store.saveSettings();
  },

  toggleMute() {
    if (Store.state.isMuted) {
      Store.state.isMuted = false;
      this.audio.volume = Store.state.volume / 100;
    } else {
      Store.state.isMuted = true;
      this.audio.volume = 0;
    }
    this._updateVolumeUI();
  },

  toggleShuffle() {
    Store.state.shuffle = !Store.state.shuffle;
    document.getElementById('full-shuffle')?.classList.toggle('active', Store.state.shuffle);
    Utils.showToast(Store.state.shuffle ? 'Shuffle on' : 'Shuffle off', 'info');
  },

  toggleRepeat() {
    const modes = ['off', 'all', 'one'];
    const idx = modes.indexOf(Store.state.repeat);
    Store.state.repeat = modes[(idx + 1) % modes.length];
    
    const btn = document.getElementById('full-repeat');
    btn?.classList.toggle('active', Store.state.repeat !== 'off');
    
    const labels = { off: 'Repeat off', all: 'Repeat all', one: 'Repeat one' };
    Utils.showToast(labels[Store.state.repeat], 'info');
  },

  toggleFavorite() {
    if (Store.state.currentTrack) {
      Store.toggleFavorite(Store.state.currentTrack);
      this._updateFavoriteButton();
    }
  },

  // Play entire playlist
  playPlaylist(playlist, shuffle = false) {
    if (!playlist.tracks || playlist.tracks.length === 0) return;
    
    let tracks = [...playlist.tracks];
    if (shuffle) {
      for (let i = tracks.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [tracks[i], tracks[j]] = [tracks[j], tracks[i]];
      }
    }
    
    Store.state.queue = tracks.map(t => ({ ...t, queueId: Utils.uid() }));
    Store.state.queueIndex = 0;
    Store.saveQueue();
    Utils.emit('queue-changed');
    this.play(tracks[0]);
  },

  // ===== SLEEP TIMER =====
  setSleepTimer(minutes) {
    this.clearSleepTimer();
    
    if (minutes < 0) return; // Cancel
    
    const statusEl = document.getElementById('sleep-status');
    
    if (minutes === 0) {
      // End of track
      Store.state.sleepTimer = 'endOfTrack';
      if (statusEl) {
        statusEl.classList.remove('hidden');
        statusEl.textContent = 'Will stop at end of track';
      }
      Utils.showToast('Sleep timer: end of track', 'info');
      return;
    }
    
    const endTime = Date.now() + minutes * 60 * 1000;
    Store.state.sleepTimer = minutes;
    Store.state.sleepTimerEnd = endTime;
    
    if (statusEl) {
      statusEl.classList.remove('hidden');
      statusEl.textContent = `Stopping in ${minutes} minutes`;
    }
    
    this._sleepEndTimeout = setTimeout(() => {
      this.stop();
      this.clearSleepTimer();
      Utils.showToast('Sleep timer ended', 'info');
    }, minutes * 60 * 1000);
    
    // Update remaining display
    this._updateSleepDisplay();
    Utils.showToast(`Sleep timer: ${minutes} minutes`, 'info');
  },

  clearSleepTimer() {
    if (this._sleepEndTimeout) clearTimeout(this._sleepEndTimeout);
    if (this._sleepTimeout) clearInterval(this._sleepTimeout);
    Store.state.sleepTimer = null;
    Store.state.sleepTimerEnd = null;
    
    const statusEl = document.getElementById('sleep-status');
    if (statusEl) {
      statusEl.classList.add('hidden');
      statusEl.textContent = '';
    }
  },

  _updateSleepDisplay() {
    if (this._sleepTimeout) clearInterval(this._sleepTimeout);
    this._sleepTimeout = setInterval(() => {
      if (!Store.state.sleepTimerEnd) return;
      const remaining = Math.max(0, Store.state.sleepTimerEnd - Date.now());
      const mins = Math.ceil(remaining / 60000);
      const statusEl = document.getElementById('sleep-status');
      if (statusEl && remaining > 0) {
        statusEl.textContent = `Stopping in ${mins} minute${mins !== 1 ? 's' : ''}`;
      }
    }, 10000);
  },

  // ===== AUDIO EVENTS =====
  _onPlay() {
    Store.state.isPlaying = true;
    this._updatePlayButtons();
    Visualizer.start();
  },

  _onPause() {
    Store.state.isPlaying = false;
    this._updatePlayButtons();
  },

  _onEnded() {
    // Handle repeat one
    if (Store.state.repeat === 'one') {
      this.seekTo(0);
      this.resume();
      return;
    }
    
    // Handle sleep timer end-of-track
    if (Store.state.sleepTimer === 'endOfTrack') {
      this.stop();
      this.clearSleepTimer();
      Utils.showToast('Sleep timer ended', 'info');
      return;
    }
    
    this.next();
  },

  _onTimeUpdate() {
    Store.state.currentTime = this.audio.currentTime;
    this._updateProgress();
  },

  _onMetadataLoaded() {
    Store.state.duration = this.audio.duration;
    this._updateProgress();
  },

  _onError(e) {
    console.error('Audio error:', e);
    const track = Store.state.currentTrack;
    if (track) {
      Utils.showToast(`Playback failed for "${track.title}"`, 'error');
    }
    // Try to skip to next
    this.next();
  },

  // ===== THEME =====
  async _updateTheme(track) {
    const palette = await ColorEngine.getPaletteForTrack(track);
    ColorEngine.applyPalette(palette);
    
    // Update ambient orbs
    if (Store.state.ambientMode) {
      const bg = document.getElementById('ambient-bg');
      bg?.classList.add('active');
    }
  },

  // ===== UI UPDATES =====
  _showMiniPlayer() {
    document.getElementById('mini-player')?.classList.remove('hidden');
    document.getElementById('page-container')?.classList.remove('no-player-pad');
  },

  _updatePlayerUI() {
    const track = Store.state.currentTrack;
    if (!track) return;
    
    // Mini player
    const miniArt = document.getElementById('mini-artwork');
    if (miniArt) {
      miniArt.innerHTML = Utils.artworkHtml(track.artworkSmall || track.artwork, 48, track.title);
    }
    
    const miniTitle = document.getElementById('mini-title');
    if (miniTitle) miniTitle.textContent = track.title;
    
    const miniArtist = document.getElementById('mini-artist');
    if (miniArtist) miniArtist.textContent = track.artist;
    
    // Full player
    const fullArt = document.getElementById('full-artwork');
    if (fullArt) {
      fullArt.innerHTML = Utils.artworkHtml(track.artwork, 400, track.title);
    }
    
    const fullTitle = document.getElementById('full-title');
    if (fullTitle) fullTitle.textContent = track.title;
    
    const fullArtist = document.getElementById('full-artist');
    if (fullArtist) fullArtist.textContent = track.artist;
    
    const fullAlbum = document.getElementById('full-album');
    if (fullAlbum) fullAlbum.textContent = track.album || '';
    
    const fullSource = document.getElementById('full-source');
    if (fullSource) {
      fullSource.className = `source-badge ${track.provider}`;
      fullSource.textContent = track.provider.toUpperCase();
    }
    
    this._updateFavoriteButton();
    
    // Media session
    this._updateMediaSession(track);
  },

  _updatePlayButtons() {
    const playing = Store.state.isPlaying;
    
    // Mini player
    const miniPlay = document.getElementById('mini-play');
    if (miniPlay) {
      miniPlay.querySelector('.icon-play')?.classList.toggle('hidden', playing);
      miniPlay.querySelector('.icon-pause')?.classList.toggle('hidden', !playing);
    }
    
    // Full player
    const fullPlay = document.getElementById('full-play');
    if (fullPlay) {
      fullPlay.querySelector('.icon-play')?.classList.toggle('hidden', playing);
      fullPlay.querySelector('.icon-pause')?.classList.toggle('hidden', !playing);
    }
  },

  _updateProgress() {
    const { currentTime, duration } = Store.state;
    const pct = duration > 0 ? (currentTime / duration) * 100 : 0;
    
    // Mini player progress
    const miniBar = document.getElementById('mini-progress-bar');
    if (miniBar) miniBar.style.width = pct + '%';
    
    // Full player slider with filled track
    const slider = document.getElementById('full-progress-slider');
    if (slider) {
      slider.value = pct;
      slider.style.backgroundSize = pct + '% 100%';
    }
    
    const timeCurrent = document.getElementById('full-time-current');
    if (timeCurrent) timeCurrent.textContent = Utils.formatTime(currentTime);
    
    const timeTotal = document.getElementById('full-time-total');
    if (timeTotal) timeTotal.textContent = Utils.formatTime(duration);
  },

  _updateVolumeUI() {
    const vol = Store.state.isMuted ? 0 : Store.state.volume;
    const slider = document.getElementById('full-volume');
    if (slider) {
      slider.value = vol;
      slider.style.backgroundSize = vol + '% 100%';
    }
    
    // Mute icons
    const muteBtn = document.getElementById('full-mute');
    if (muteBtn) {
      muteBtn.querySelector('.icon-volume')?.classList.toggle('hidden', Store.state.isMuted);
      muteBtn.querySelector('.icon-muted')?.classList.toggle('hidden', !Store.state.isMuted);
    }
  },

  _updateFavoriteButton() {
    const track = Store.state.currentTrack;
    if (!track) return;
    
    const isFav = Store.isFavorite(track.id);
    
    const btn = document.getElementById('full-favorite');
    if (btn) {
      btn.classList.toggle('favorited', isFav);
      const svg = btn.querySelector('svg');
      if (svg) svg.setAttribute('fill', isFav ? 'currentColor' : 'none');
    }
  },

  // ===== CONTROLS SETUP =====
  _setupMiniPlayerControls() {
    document.getElementById('mini-play')?.addEventListener('click', () => this.togglePlay());
    document.getElementById('mini-prev')?.addEventListener('click', () => this.previous());
    document.getElementById('mini-next')?.addEventListener('click', () => this.next());
    document.getElementById('mini-expand')?.addEventListener('click', () => this._openFullPlayer());
    
    // Mini progress click to seek
    document.querySelector('.mini-player-progress')?.addEventListener('click', (e) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const pct = (e.clientX - rect.left) / rect.width;
      this.seekTo(pct * Store.state.duration);
    });
  },

  _setupFullPlayerControls() {
    document.getElementById('full-play')?.addEventListener('click', () => this.togglePlay());
    document.getElementById('full-prev')?.addEventListener('click', () => this.previous());
    document.getElementById('full-next')?.addEventListener('click', () => this.next());
    document.getElementById('full-shuffle')?.addEventListener('click', () => this.toggleShuffle());
    document.getElementById('full-repeat')?.addEventListener('click', () => this.toggleRepeat());
    document.getElementById('full-favorite')?.addEventListener('click', () => this.toggleFavorite());
    document.getElementById('full-mute')?.addEventListener('click', () => this.toggleMute());
    
    document.getElementById('full-volume')?.addEventListener('input', (e) => {
      this.setVolume(parseInt(e.target.value));
    });
    
    document.getElementById('full-player-close')?.addEventListener('click', () => this._closeFullPlayer());
    document.getElementById('full-queue-btn')?.addEventListener('click', () => this._toggleQueue());
    
    // Sleep timer
    document.getElementById('full-sleep')?.addEventListener('click', () => {
      document.getElementById('sleep-modal')?.classList.toggle('hidden');
    });
    
    document.querySelectorAll('.sleep-option').forEach(btn => {
      btn.addEventListener('click', () => {
        const mins = parseInt(btn.dataset.minutes);
        this.setSleepTimer(mins);
        document.getElementById('sleep-modal')?.classList.add('hidden');
      });
    });
  },

  _setupProgressBarInteraction() {
    const slider = document.getElementById('full-progress-slider');
    if (!slider) return;
    
    let isDragging = false;
    
    slider.addEventListener('mousedown', () => { isDragging = true; });
    slider.addEventListener('touchstart', () => { isDragging = true; });
    
    slider.addEventListener('input', () => {
      if (!isDragging) return;
      const pct = slider.value / 100;
      this.seekTo(pct * Store.state.duration);
    });
    
    slider.addEventListener('change', () => {
      isDragging = false;
      const pct = slider.value / 100;
      this.seekTo(pct * Store.state.duration);
    });
  },

  _setupMediaSession() {
    if (!('mediaSession' in navigator)) return;
    
    navigator.mediaSession.setActionHandler('play', () => this.resume());
    navigator.mediaSession.setActionHandler('pause', () => this.pause());
    navigator.mediaSession.setActionHandler('previoustrack', () => this.previous());
    navigator.mediaSession.setActionHandler('nexttrack', () => this.next());
    navigator.mediaSession.setActionHandler('seekto', (details) => {
      if (details.seekTime != null) this.seekTo(details.seekTime);
    });
  },

  _updateMediaSession(track) {
    if (!('mediaSession' in navigator)) return;
    
    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.title,
      artist: track.artist,
      album: track.album || '',
      artwork: track.artwork ? [
        { src: track.artwork, sizes: '512x512', type: 'image/jpeg' }
      ] : []
    });
  },

  // ===== FULL PLAYER =====
  _openFullPlayer() {
    document.getElementById('full-player')?.classList.remove('hidden');
    Store.state.showFullPlayer = true;
  },

  _closeFullPlayer() {
    document.getElementById('full-player')?.classList.add('hidden');
    Store.state.showFullPlayer = false;
  },

  // ===== QUEUE PANEL =====
  _toggleQueue() {
    const panel = document.getElementById('queue-panel');
    panel?.classList.toggle('hidden');
    Store.state.showQueue = !panel?.classList.contains('hidden');
    if (Store.state.showQueue) this._renderQueue();
  },

  renderQueuePanel() {
    this._renderQueue();
  },

  _renderQueue() {
    const list = document.getElementById('queue-list');
    if (!list) return;
    
    const { queue, queueIndex } = Store.state;
    
    if (queue.length === 0) {
      list.innerHTML = '<div class="queue-empty">Queue is empty</div>';
      return;
    }
    
    list.innerHTML = queue.map((track, i) => `
      <div class="queue-track ${i === queueIndex ? 'current' : ''}" data-queue-index="${i}" data-queue-id="${track.queueId}">
        <span class="queue-track-number">${i + 1}</span>
        <div class="queue-track-art">
          ${Utils.artworkHtml(track.artworkSmall || track.artwork, 36, track.title)}
        </div>
        <div class="queue-track-info">
          <div class="queue-track-title">${Utils.escapeHtml(track.title)}</div>
          <div class="queue-track-artist">${Utils.escapeHtml(track.artist)}</div>
        </div>
        <button class="track-action-btn queue-track-remove" data-remove-queue="${track.queueId}" title="Remove">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" x2="6" y1="6" y2="18"/><line x1="6" x2="18" y1="6" y2="18"/></svg>
        </button>
      </div>
    `).join('');
    
    // Click to play
    list.querySelectorAll('.queue-track').forEach(el => {
      el.addEventListener('click', (e) => {
        if (e.target.closest('[data-remove-queue]')) {
          Store.removeFromQueue(el.dataset.queueId);
          this._renderQueue();
          return;
        }
        const idx = parseInt(el.dataset.queueIndex);
        if (idx >= 0 && idx < queue.length) {
          Store.state.queueIndex = idx;
          this.play(queue[idx]);
        }
      });
    });
  }
};
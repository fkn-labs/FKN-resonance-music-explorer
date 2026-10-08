// ===== AUDIO VISUALIZER =====

const Visualizer = {
  canvas: null,
  ctx: null,
  audioContext: null,
  analyser: null,
  dataArray: null,
  animationId: null,
  mode: 'ambient',
  isActive: false,
  audioSource: null,
  _connected: false,

  init(canvasElement) {
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext('2d');
    this.resize();
    window.addEventListener('resize', () => this.resize());
  },

  resize() {
    if (!this.canvas) return;
    this.canvas.width = window.innerWidth;
    this.canvas.height = 200;
  },

  // Resume AudioContext — MUST be called from a user gesture handler
  async resumeContext() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.audioContext.state === 'suspended') {
      try {
        await this.audioContext.resume();
      } catch (err) {
        console.warn('Could not resume AudioContext:', err);
      }
    }
    return this.audioContext.state === 'running';
  },

  // Connect to audio element. Must be called from a user gesture.
  // Returns true if connected, false if it should be retried later.
  async connectAudio(audioElement) {
    // Already connected to this element — don't double-connect
    if (this._connected && this.audioSource) return true;

    try {
      const running = await this.resumeContext();
      if (!running) return false;

      // Disconnect previous source if any
      if (this.audioSource) {
        try { this.audioSource.disconnect(); } catch {}
        this.audioSource = null;
      }

      this.audioSource = this.audioContext.createMediaElementSource(audioElement);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.8;

      this.audioSource.connect(this.analyser);
      this.analyser.connect(this.audioContext.destination);

      const bufferLength = this.analyser.frequencyBinCount;
      this.dataArray = new Uint8Array(bufferLength);

      this._connected = true;
      return true;
    } catch (err) {
      // createMediaElementSource throws if already connected to a different context
      console.warn('Visualizer audio connection failed:', err);
      this._connected = false;
      return false;
    }
  },

  // Disconnect so audio plays directly to speakers without going through context
  disconnectAudio() {
    if (this.audioSource) {
      try { this.audioSource.disconnect(); } catch {}
      this.audioSource = null;
    }
    this.analyser = null;
    this.dataArray = null;
    this._connected = false;
  },

  setMode(mode) {
    this.mode = mode;
    if (mode === 'off') {
      this.stop();
    }
  },

  start() {
    if (this.isActive || this.mode === 'off') return;
    this.isActive = true;
    this.canvas?.classList.add('active');
    this.draw();
  },

  stop() {
    this.isActive = false;
    this.canvas?.classList.remove('active');
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    if (this.ctx) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
  },

  draw() {
    if (!this.isActive || !this.ctx) return;
    
    this.animationId = requestAnimationFrame(() => this.draw());
    
    const { width, height } = this.canvas;
    this.ctx.clearRect(0, 0, width, height);
    
    const style = getComputedStyle(document.documentElement);
    const primary = style.getPropertyValue('--music-primary').trim() || '#8B5CF6';
    const secondary = style.getPropertyValue('--music-secondary').trim() || '#6D28D9';
    
    switch (this.mode) {
      case 'ambient': this.drawAmbient(width, height, primary, secondary); break;
      case 'wave': this.drawWave(width, height, primary, secondary); break;
      case 'spectrum': this.drawSpectrum(width, height, primary, secondary); break;
      case 'pulse': this.drawPulse(width, height, primary, secondary); break;
      case 'minimal': break;
    }
  },

  getAudioData() {
    if (this.analyser && this.dataArray) {
      this.analyser.getByteFrequencyData(this.dataArray);
      return this.dataArray;
    }
    const time = Date.now() / 1000;
    const data = new Uint8Array(128);
    for (let i = 0; i < 128; i++) {
      data[i] = Math.floor(
        40 +
        Math.sin(time * 2 + i * 0.1) * 30 +
        Math.sin(time * 1.3 + i * 0.05) * 20
      );
    }
    return data;
  },

  drawAmbient(w, h, primary, secondary) {
    const time = Date.now() / 3000;
    const data = this.getAudioData();
    const avg = data.reduce((s, v) => s + v, 0) / data.length;
    const intensity = avg / 255;
    
    const gradient = this.ctx.createLinearGradient(0, h, w, 0);
    gradient.addColorStop(0, this.hexToRgba(primary, 0.05 + intensity * 0.1));
    gradient.addColorStop(0.5, this.hexToRgba(secondary, 0.03 + intensity * 0.08));
    gradient.addColorStop(1, this.hexToRgba(primary, 0.02 + intensity * 0.05));
    
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, w, h);
    
    this.ctx.beginPath();
    this.ctx.strokeStyle = this.hexToRgba(primary, 0.1 + intensity * 0.15);
    this.ctx.lineWidth = 1.5;
    
    const sliceWidth = w / data.length;
    let x = 0;
    for (let i = 0; i < data.length; i++) {
      const v = data[i] / 255;
      const y = h - (v * h * 0.4) + Math.sin(time + i * 0.05) * 10;
      if (i === 0) this.ctx.moveTo(x, y);
      else this.ctx.lineTo(x, y);
      x += sliceWidth;
    }
    this.ctx.stroke();
  },

  drawWave(w, h, primary, secondary) {
    const time = Date.now() / 1000;
    const data = this.getAudioData();
    for (let layer = 0; layer < 3; layer++) {
      this.ctx.beginPath();
      const alpha = 0.15 - layer * 0.04;
      this.ctx.strokeStyle = this.hexToRgba(layer === 0 ? primary : secondary, alpha);
      this.ctx.lineWidth = 2 - layer * 0.5;
      for (let i = 0; i < data.length; i++) {
        const x = (i / data.length) * w;
        const v = data[i] / 255;
        const y = h * 0.5 + (v - 0.5) * h * 0.6 * (1 - layer * 0.2) +
                  Math.sin(time * (1 + layer * 0.3) + i * 0.03) * 8;
        if (i === 0) this.ctx.moveTo(x, y);
        else this.ctx.lineTo(x, y);
      }
      this.ctx.stroke();
    }
  },

  drawSpectrum(w, h, primary, secondary) {
    const data = this.getAudioData();
    const barCount = 64;
    const barWidth = w / barCount;
    const gap = 2;
    for (let i = 0; i < barCount; i++) {
      const dataIndex = Math.floor(i * data.length / barCount);
      const v = data[dataIndex] / 255;
      const barHeight = v * h * 0.8;
      const gradient = this.ctx.createLinearGradient(0, h, 0, h - barHeight);
      gradient.addColorStop(0, this.hexToRgba(primary, 0.3));
      gradient.addColorStop(1, this.hexToRgba(secondary, 0.1));
      this.ctx.fillStyle = gradient;
      this.ctx.fillRect(i * barWidth + gap / 2, h - barHeight, barWidth - gap, barHeight);
    }
  },

  drawPulse(w, h, primary, secondary) {
    const time = Date.now() / 1000;
    const data = this.getAudioData();
    const avg = data.reduce((s, v) => s + v, 0) / data.length;
    const intensity = avg / 255;
    const centerX = w / 2;
    const centerY = h;
    const maxRadius = Math.min(w, h) * 0.8;
    for (let i = 3; i >= 0; i--) {
      const radius = maxRadius * (0.3 + intensity * 0.5 + i * 0.15) + Math.sin(time + i) * 10;
      const alpha = 0.08 - i * 0.015;
      this.ctx.beginPath();
      this.ctx.arc(centerX, centerY, radius, 0, Math.PI, true);
      this.ctx.strokeStyle = this.hexToRgba(i % 2 === 0 ? primary : secondary, alpha);
      this.ctx.lineWidth = 2;
      this.ctx.stroke();
    }
  },

  hexToRgba(hex, alpha) {
    if (!hex || hex.length < 7) return 'rgba(139, 92, 246, ' + alpha + ')';
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return 'rgba(' + r + ', ' + g + ', ' + b + ', ' + alpha + ')';
  }
};
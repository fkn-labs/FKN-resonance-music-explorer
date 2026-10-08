// ===== COLOR EXTRACTION & DYNAMIC THEME =====

const ColorEngine = {
  // Cache extracted palettes
  cache: new Map(),
  
  // Fallback palettes by genre/mood
  genrePalettes: {
    pop: { primary: '#E879F9', secondary: '#C084FC', tertiary: '#818CF8' },
    rock: { primary: '#EF4444', secondary: '#F97316', tertiary: '#EAB308' },
    electronic: { primary: '#06B6D4', secondary: '#3B82F6', tertiary: '#8B5CF6' },
    hiphop: { primary: '#F59E0B', secondary: '#D97706', tertiary: '#B45309' },
    jazz: { primary: '#8B5CF6', secondary: '#6366F1', tertiary: '#4F46E5' },
    classical: { primary: '#A78BFA', secondary: '#C4B5FD', tertiary: '#DDD6FE' },
    rnb: { primary: '#EC4899', secondary: '#F472B6', tertiary: '#FB7185' },
    latin: { primary: '#F97316', secondary: '#EF4444', tertiary: '#EAB308' },
    afrobeats: { primary: '#F59E0B', secondary: '#EF4444', tertiary: '#D97706' },
    metal: { primary: '#6B7280', secondary: '#9CA3AF', tertiary: '#4B5563' },
    country: { primary: '#D97706', secondary: '#92400E', tertiary: '#B45309' },
    reggae: { primary: '#22C55E', secondary: '#EAB308', tertiary: '#EF4444' },
    default: { primary: '#8B5CF6', secondary: '#6D28D9', tertiary: '#4C1D95' }
  },

  // Provider fallback palettes
  providerPalettes: {
    itunes: { primary: '#B56CE7', secondary: '#9333EA', tertiary: '#6B21A8' },
    deezer: { primary: '#A238FF', secondary: '#7C3AED', tertiary: '#5B21B6' },
    audius: { primary: '#CC0FE0', secondary: '#A855F7', tertiary: '#7C3AED' },
    jamendo: { primary: '#FF6600', secondary: '#F59E0B', tertiary: '#D97706' },
    youtube: { primary: '#FF0000', secondary: '#DC2626', tertiary: '#B91C1C' }
  },

  // Extract dominant colors from image URL
  async extract(imageUrl) {
    if (!imageUrl) return null;
    
    // Check cache
    if (this.cache.has(imageUrl)) {
      return this.cache.get(imageUrl);
    }

    try {
      const colors = await this._extractFromImage(imageUrl);
      if (colors) {
        this.cache.set(imageUrl, colors);
        // Limit cache size
        if (this.cache.size > 50) {
          const firstKey = this.cache.keys().next().value;
          this.cache.delete(firstKey);
        }
      }
      return colors;
    } catch (err) {
      console.warn('Color extraction failed:', err);
      return null;
    }
  },

  // Extract colors using canvas
  _extractFromImage(imageUrl) {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      const timeout = setTimeout(() => {
        resolve(null);
      }, 5000);

      img.onload = () => {
        clearTimeout(timeout);
        try {
          const canvas = document.createElement('canvas');
          const size = 64; // Small for performance
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, size, size);
          
          const imageData = ctx.getImageData(0, 0, size, size).data;
          const colors = this._quantizeColors(imageData, size * size);
          resolve(colors);
        } catch {
          resolve(null);
        }
      };

      img.onerror = () => {
        clearTimeout(timeout);
        resolve(null);
      };

      // Use a CORS proxy or direct load
      img.src = imageUrl;
    });
  },

  // Simple color quantization
  _quantizeColors(pixels, pixelCount) {
    const buckets = {};
    const step = 4 * 4; // Sample every 4th pixel for performance
    
    for (let i = 0; i < pixels.length; i += step) {
      const r = pixels[i];
      const g = pixels[i + 1];
      const b = pixels[i + 2];
      const a = pixels[i + 3];
      
      // Skip transparent and near-white/near-black
      if (a < 128) continue;
      if (r > 240 && g > 240 && b > 240) continue;
      if (r < 15 && g < 15 && b < 15) continue;
      
      // Quantize to reduce unique colors
      const qr = Math.round(r / 32) * 32;
      const qg = Math.round(g / 32) * 32;
      const qb = Math.round(b / 32) * 32;
      const key = `${qr},${qg},${qb}`;
      
      if (!buckets[key]) {
        buckets[key] = { r: qr, g: qg, b: qb, count: 0, sumR: 0, sumG: 0, sumB: 0 };
      }
      buckets[key].count++;
      buckets[key].sumR += r;
      buckets[key].sumG += g;
      buckets[key].sumB += b;
    }
    
    // Sort by frequency
    const sorted = Object.values(buckets)
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
    
    if (sorted.length === 0) return null;
    
    // Pick diverse colors
    const picked = this._pickDiverseColors(sorted);
    
    if (picked.length < 2) return null;
    
    const primary = this._avgColor(picked[0]);
    const secondary = picked.length > 1 ? this._avgColor(picked[1]) : this._darken(primary, 0.3);
    const tertiary = picked.length > 2 ? this._avgColor(picked[2]) : this._darken(secondary, 0.3);
    
    return {
      primary: this._rgbToHex(primary),
      secondary: this._rgbToHex(secondary),
      tertiary: this._rgbToHex(tertiary)
    };
  },

  // Pick visually diverse colors
  _pickDiverseColors(sorted) {
    const picked = [sorted[0]];
    
    for (let i = 1; i < sorted.length && picked.length < 3; i++) {
      const candidate = sorted[i];
      let isDiverse = true;
      
      for (const p of picked) {
        const dist = Math.abs(candidate.r - p.r) + Math.abs(candidate.g - p.g) + Math.abs(candidate.b - p.b);
        if (dist < 80) {
          isDiverse = false;
          break;
        }
      }
      
      if (isDiverse) picked.push(candidate);
    }
    
    return picked;
  },

  _avgColor(bucket) {
    return {
      r: Math.round(bucket.sumR / bucket.count),
      g: Math.round(bucket.sumG / bucket.count),
      b: Math.round(bucket.sumB / bucket.count)
    };
  },

  _darken(color, amount) {
    return {
      r: Math.max(0, Math.round(color.r * (1 - amount))),
      g: Math.max(0, Math.round(color.g * (1 - amount))),
      b: Math.max(0, Math.round(color.b * (1 - amount)))
    };
  },

  _rgbToHex({ r, g, b }) {
    return '#' + [r, g, b].map(c => c.toString(16).padStart(2, '0')).join('');
  },

  // Apply palette to CSS variables
  applyPalette(palette) {
    if (!palette) return;
    
    const root = document.documentElement;
    root.style.setProperty('--music-primary', palette.primary);
    root.style.setProperty('--music-secondary', palette.secondary);
    root.style.setProperty('--music-tertiary', palette.tertiary);
    root.style.setProperty('--music-glow', palette.primary + '33');
  },

  // Get palette from track
  async getPaletteForTrack(track) {
    // Try artwork extraction first
    if (track.artwork) {
      const extracted = await this.extract(track.artwork);
      if (extracted) return extracted;
    }
    
    // Genre fallback
    if (track.genre) {
      const genreKey = Object.keys(this.genrePalettes).find(k => 
        track.genre.toLowerCase().includes(k)
      );
      if (genreKey) return this.genrePalettes[genreKey];
    }
    
    // Provider fallback
    return this.providerPalettes[track.provider] || this.genrePalettes.default;
  },

  // Reset to default
  resetPalette() {
    const defaultPalette = this.genrePalettes.default;
    this.applyPalette(defaultPalette);
  }
};
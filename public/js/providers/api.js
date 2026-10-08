// ===== API CLIENT =====

const API = {
  // Active search abort controller
  _searchController: null,

  // Search all providers
  async search(query, options = {}) {
    // Abort any previous search
    if (this._searchController) {
      this._searchController.abort();
    }
    this._searchController = new AbortController();
    
    const params = new URLSearchParams({ q: query, limit: options.limit || 25 });
    if (options.providers) params.set('providers', options.providers.join(','));
    
    try {
      const data = await Utils.fetchJSON(`/api/search?${params}`, {
        signal: this._searchController.signal
      });
      return data;
    } catch (err) {
      if (err.name === 'AbortError') return null;
      throw err;
    }
  },

  // Search with Server-Sent Events for progressive results
  async searchProgressive(query, onProvider, onComplete, onError) {
    if (this._searchController) {
      this._searchController.abort();
    }
    this._searchController = new AbortController();
    
    try {
      const params = new URLSearchParams({ q: query, stream: 'true' });
      const res = await fetch(`/api/search?${params}`, {
        signal: this._searchController.signal
      });
      
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.type === 'provider' && onProvider) {
                onProvider(data);
              } else if (data.type === 'complete' && onComplete) {
                onComplete(data);
              }
            } catch {}
          }
        }
      }
    } catch (err) {
      if (err.name === 'AbortError') return;
      if (onError) onError(err);
    }
  },

  // Find full version
  async findFullVersion(query) {
    const params = new URLSearchParams({ q: query });
    return Utils.fetchJSON(`/api/search/full-version?${params}`);
  },

  // Get discover data
  async getDiscover() {
    return Utils.fetchJSON('/api/discover');
  },

  // Get provider health
  async getProviderHealth() {
    return Utils.fetchJSON('/api/providers/status');
  },

  // Cancel active search
  cancelSearch() {
    if (this._searchController) {
      this._searchController.abort();
      this._searchController = null;
    }
  }
};
const express = require('express');
const router = express.Router();
const { providers, recordSuccess, recordFailure, isAvailable } = require('../providers');

// Human-readable missing-config messages
function getMissingConfigMessage(providerName) {
  const messages = {
    jamendo: 'Requires JAMENDO_CLIENT_ID in .env — register at https://developer.jamendo.com',
    youtube: 'Requires YOUTUBE_API_KEY in .env — enable YouTube Data API v3 in Google Cloud Console'
  };
  return messages[providerName] || 'Not configured';
}

// Cache for search results
const searchCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCacheKey(query, options) {
  return `${query.toLowerCase().trim()}_${options.limit || 25}_${options.providers || 'all'}`;
}

function getFromCache(key) {
  const entry = searchCache.get(key);
  if (entry && Date.now() - entry.time < CACHE_TTL) {
    return entry.data;
  }
  searchCache.delete(key);
  return null;
}

function setCache(key, data) {
  // Limit cache size
  if (searchCache.size > 200) {
    const oldest = [...searchCache.entries()]
      .sort((a, b) => a[1].time - b[1].time)
      .slice(0, 50);
    oldest.forEach(([k]) => searchCache.delete(k));
  }
  searchCache.set(key, { data, time: Date.now() });
}

// Main search endpoint - returns results progressively via SSE or aggregated
router.get('/', async (req, res) => {
  const query = req.query.q;
  if (!query || query.trim().length === 0) {
    return res.json({ tracks: [], providers: {}, query: '' });
  }
  
  const limit = Math.min(parseInt(req.query.limit) || 25, 50);
  const requestedProviders = req.query.providers ? req.query.providers.split(',') : null;
  const useSSE = req.query.stream === 'true';
  
  // Check cache
  const cacheKey = getCacheKey(query, { limit, providers: requestedProviders });
  const cached = getFromCache(cacheKey);
  if (cached && !useSSE) {
    return res.json(cached);
  }
  
  // Determine which providers to query
  const providersToQuery = [];
  const allProviders = ['itunes', 'deezer', 'audius', 'jamendo', 'youtube'];
  
  for (const name of allProviders) {
    if (requestedProviders && !requestedProviders.includes(name)) continue;
    if (isAvailable(name)) {
      providersToQuery.push(name);
    }
  }
  
  // YouTube special handling: only search if explicitly requested or via "find full version"
  if (providersToQuery.includes('youtube') && !requestedProviders?.includes('youtube')) {
    // Don't auto-search YouTube for normal searches
    const idx = providersToQuery.indexOf('youtube');
    providersToQuery.splice(idx, 1);
  }
  
  if (useSSE) {
    // Server-Sent Events for progressive results
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();
    
    const results = { tracks: [], providers: {}, query };
    const promises = providersToQuery.map(async (name) => {
      try {
        const result = await providers[name].search(query, limit);
        if (result.error) {
          recordFailure(name);
          results.providers[name] = { status: 'error', error: result.error, tracks: 0 };
        } else {
          recordSuccess(name);
          results.tracks.push(...result.tracks);
          results.providers[name] = { status: 'ok', tracks: result.tracks.length };
        }
        // Send progressive update
        res.write(`data: ${JSON.stringify({ type: 'provider', provider: name, ...results.providers[name], tracks: result.tracks || [] })}\n\n`);
      } catch (err) {
        recordFailure(name);
        results.providers[name] = { status: 'error', error: err.message, tracks: 0 };
        res.write(`data: ${JSON.stringify({ type: 'provider', provider: name, status: 'error', error: err.message, tracks: [] })}\n\n`);
      }
    });
    
    // Also mark unconfigured/unavailable providers
    for (const name of ['jamendo', 'youtube']) {
      if (!isAvailable(name) && !providersToQuery.includes(name)) {
        const notConfigured = providers[name].isConfigured && !providers[name].isConfigured();
        results.providers[name] = { 
          status: notConfigured ? 'unconfigured' : 'unavailable', 
          error: notConfigured ? getMissingConfigMessage(name) : 'Temporarily unavailable', 
          tracks: 0 
        };
      }
    }
    
    await Promise.allSettled(promises);
    res.write(`data: ${JSON.stringify({ type: 'complete', ...results })}\n\n`);
    res.end();
  } else {
    // Standard aggregated response
    const promises = providersToQuery.map(async (name) => {
      try {
        const result = await providers[name].search(query, limit);
        if (result.error) {
          recordFailure(name);
          return { provider: name, tracks: [], status: 'error', error: result.error };
        } else {
          recordSuccess(name);
          return { provider: name, tracks: result.tracks, status: 'ok' };
        }
      } catch (err) {
        recordFailure(name);
        return { provider: name, tracks: [], status: 'error', error: err.message };
      }
    });
    
    const settled = await Promise.allSettled(promises);
    
    const response = {
      tracks: [],
      providers: {},
      query
    };
    
    for (const result of settled) {
      if (result.status === 'fulfilled') {
        const { provider, tracks, status, error } = result.value;
        response.tracks.push(...tracks);
        response.providers[provider] = { status, tracks: tracks.length, error };
      }
    }
    
    // Mark unavailable providers
    for (const name of allProviders) {
      if (!response.providers[name]) {
        if (!isAvailable(name)) {
          const notConfigured = providers[name].isConfigured && !providers[name].isConfigured();
          response.providers[name] = { 
            status: notConfigured ? 'unconfigured' : 'unavailable', 
            error: notConfigured ? getMissingConfigMessage(name) : 'Temporarily unavailable',
            tracks: 0 
          };
        }
      }
    }
    
    setCache(cacheKey, response);
    res.json(response);
  }
});

// Find full version endpoint - searches specifically for full-track sources
router.get('/full-version', async (req, res) => {
  const query = req.query.q;
  if (!query || query.trim().length === 0) {
    return res.json({ tracks: [], query: '' });
  }
  
  const limit = 10;
  const fullProviders = ['audius', 'jamendo', 'youtube'];
  
  const promises = fullProviders.map(async (name) => {
    if (!isAvailable(name)) return { provider: name, tracks: [], status: 'unavailable' };
    try {
      const result = await providers[name].search(query, limit);
      if (result.error) return { provider: name, tracks: [], status: 'error', error: result.error };
      recordSuccess(name);
      return { provider: name, tracks: result.tracks, status: 'ok' };
    } catch (err) {
      recordFailure(name);
      return { provider: name, tracks: [], status: 'error', error: err.message };
    }
  });
  
  const settled = await Promise.allSettled(promises);
  const response = { tracks: [], providers: {}, query };
  
  for (const result of settled) {
    if (result.status === 'fulfilled') {
      const { provider, tracks, status, error } = result.value;
      response.tracks.push(...tracks);
      response.providers[provider] = { status, tracks: tracks.length, error };
    }
  }
  
  res.json(response);
});

module.exports = router;
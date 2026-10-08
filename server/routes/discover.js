const express = require('express');
const router = express.Router();
const { providers, isAvailable, recordSuccess, recordFailure } = require('../providers');

// Cache for discover data
const discoverCache = new Map();
const DISCOVER_CACHE_TTL = 15 * 60 * 1000; // 15 minutes

function getCached(key) {
  const entry = discoverCache.get(key);
  if (entry && Date.now() - entry.time < DISCOVER_CACHE_TTL) {
    return entry.data;
  }
  discoverCache.delete(key);
  return null;
}

function setCached(key, data) {
  discoverCache.set(key, { data, time: Date.now() });
}

// Get all discover data in one request
router.get('/', async (req, res) => {
  const cached = getCached('discover_all');
  if (cached) return res.json(cached);
  
  const promises = {};
  
  // Audius Trending
  if (isAvailable('audius')) {
    promises.audiusTrending = providers.audius.getTrending(20)
      .then(r => { recordSuccess('audius'); return r; })
      .catch(err => { recordFailure('audius'); return { tracks: [], error: err.message }; });
  }
  
  // Deezer Charts
  if (isAvailable('deezer')) {
    promises.deezerCharts = providers.deezer.getCharts(20)
      .then(r => { recordSuccess('deezer'); return r; })
      .catch(err => { recordFailure('deezer'); return { tracks: [], error: err.message }; });
  }
  
  // Jamendo New Releases
  if (isAvailable('jamendo') && providers.jamendo.isConfigured?.()) {
    promises.jamendoNew = providers.jamendo.getNewReleases(20)
      .then(r => { if (!r.error) recordSuccess('jamendo'); else recordFailure('jamendo'); return r; })
      .catch(err => { recordFailure('jamendo'); return { tracks: [], error: err.message }; });
  }
  
  const settled = await Promise.allSettled(Object.values(promises));
  const keys = Object.keys(promises);
  const result = {};
  
  keys.forEach((key, i) => {
    const outcome = settled[i];
    if (outcome.status === 'fulfilled') {
      result[key] = outcome.value;
    } else {
      result[key] = { tracks: [], error: outcome.reason?.message || 'Failed' };
    }
  });
  
  setCached('discover_all', result);
  res.json(result);
});

module.exports = router;
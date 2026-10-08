// iTunes Search API - No key required
// https://developer.apple.com/library/archive/documentation/AudioVideo/Conceptual/iTuneSearchAPI/
const fetch = require('node-fetch');

const BASE_URL = 'https://itunes.apple.com/search';
const LOOKUP_URL = 'https://itunes.apple.com/lookup';

// Rate limiting
let lastRequest = 0;
const MIN_INTERVAL = 200;

async function throttledFetch(url, options = {}) {
  const now = Date.now();
  const wait = Math.max(0, MIN_INTERVAL - (now - lastRequest));
  if (wait > 0) await new Promise(r => setTimeout(r, wait));
  lastRequest = Date.now();
  
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timeout);
    return res;
  } catch (err) {
    clearTimeout(timeout);
    throw err;
  }
}

function normalizeTrack(track) {
  if (!track) return null;
  return {
    id: `itunes_${track.trackId}`,
    title: track.trackName || 'Unknown',
    artist: track.artistName || 'Unknown Artist',
    album: track.collectionName || '',
    artwork: track.artworkUrl100 ? track.artworkUrl100.replace('100x100', '600x600') : null,
    artworkSmall: track.artworkUrl100 || null,
    duration: track.trackTimeMillis ? Math.round(track.trackTimeMillis / 1000) : 0,
    provider: 'itunes',
    providerUrl: track.trackViewUrl || '',
    playbackType: 'preview',
    previewUrl: track.previewUrl || null,
    fullUrl: null,
    explicit: track.trackExplicitness === 'explicit',
    genre: track.primaryGenreName || '',
    releaseDate: track.releaseDate || '',
    trackCount: track.trackCount || 0,
    trackNumber: track.trackNumber || 0
  };
}

async function search(query, limit = 25) {
  try {
    const params = new URLSearchParams({
      term: query,
      media: 'music',
      entity: 'song',
      limit: String(limit),
      country: 'US'
    });
    
    const res = await throttledFetch(`${BASE_URL}?${params}`);
    if (!res.ok) throw new Error(`iTunes API error: ${res.status}`);
    
    const data = await res.json();
    if (!data.results || !Array.isArray(data.results)) {
      return { tracks: [], error: null };
    }
    
    return {
      tracks: data.results.map(normalizeTrack).filter(Boolean),
      error: null
    };
  } catch (err) {
    console.error('iTunes search error:', err.message);
    return { tracks: [], error: err.message };
  }
}

async function lookup(trackId) {
  try {
    const id = trackId.replace('itunes_', '');
    const params = new URLSearchParams({ id });
    const res = await throttledFetch(`${LOOKUP_URL}?${params}`);
    if (!res.ok) throw new Error(`iTunes lookup error: ${res.status}`);
    
    const data = await res.json();
    if (!data.results || data.results.length === 0) return null;
    return normalizeTrack(data.results[0]);
  } catch (err) {
    console.error('iTunes lookup error:', err.message);
    return null;
  }
}

module.exports = { search, lookup, name: 'iTunes' };
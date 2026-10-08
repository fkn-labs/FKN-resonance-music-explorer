// Deezer API - No key required for search
// https://developers.deezer.com/api/search
const fetch = require('node-fetch');

const BASE_URL = 'https://api.deezer.com';

let lastRequest = 0;
const MIN_INTERVAL = 200;

async function throttledFetch(url) {
  const now = Date.now();
  const wait = Math.max(0, MIN_INTERVAL - (now - lastRequest));
  if (wait > 0) await new Promise(r => setTimeout(r, wait));
  lastRequest = Date.now();
  
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  
  try {
    const res = await fetch(url, { signal: controller.signal });
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
    id: `deezer_${track.id}`,
    title: track.title || 'Unknown',
    artist: track.artist?.name || 'Unknown Artist',
    album: track.album?.title || '',
    artwork: track.album?.cover_xl || track.album?.cover_big || track.album?.cover || null,
    artworkSmall: track.album?.cover_small || track.album?.cover || null,
    duration: track.duration || 0,
    provider: 'deezer',
    providerUrl: track.link || '',
    playbackType: 'preview',
    previewUrl: track.preview || null,
    fullUrl: null,
    explicit: track.explicit_lyrics || false,
    genre: '',
    releaseDate: ''
  };
}

async function search(query, limit = 25) {
  try {
    const params = new URLSearchParams({ q: query, limit: String(limit) });
    const res = await throttledFetch(`${BASE_URL}/search?${params}`);
    if (!res.ok) throw new Error(`Deezer API error: ${res.status}`);
    
    const data = await res.json();
    if (!data.data || !Array.isArray(data.data)) {
      return { tracks: [], error: null };
    }
    
    return {
      tracks: data.data.map(normalizeTrack).filter(Boolean),
      error: null
    };
  } catch (err) {
    console.error('Deezer search error:', err.message);
    return { tracks: [], error: err.message };
  }
}

async function getCharts(limit = 25) {
  try {
    const res = await throttledFetch(`${BASE_URL}/chart/0/tracks?limit=${limit}`);
    if (!res.ok) throw new Error(`Deezer charts error: ${res.status}`);
    
    const data = await res.json();
    if (!data.data || !Array.isArray(data.data)) {
      return { tracks: [], error: null };
    }
    
    return {
      tracks: data.data.map(normalizeTrack).filter(Boolean),
      error: null
    };
  } catch (err) {
    console.error('Deezer charts error:', err.message);
    return { tracks: [], error: err.message };
  }
}

module.exports = { search, getCharts, name: 'Deezer' };
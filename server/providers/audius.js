// Audius API - Works without API key for many endpoints
// https://audius.org/api
const fetch = require('node-fetch');

const DISCOVERY_URL = 'https://discoveryprovider.audius.co';
const APP_NAME = process.env.AUDIUS_APP_NAME || 'music-explorer';

let lastRequest = 0;
const MIN_INTERVAL = 200;

async function apiFetch(path, params = {}) {
  const now = Date.now();
  const wait = Math.max(0, MIN_INTERVAL - (now - lastRequest));
  if (wait > 0) await new Promise(r => setTimeout(r, wait));
  lastRequest = Date.now();
  
  const url = new URL(`${DISCOVERY_URL}${path}`);
  url.searchParams.set('app_name', APP_NAME);
  if (process.env.AUDIUS_API_KEY) {
    url.searchParams.set('api_key', process.env.AUDIUS_API_KEY);
  }
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, String(v));
  }
  
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  
  try {
    const res = await fetch(url.toString(), { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) throw new Error(`Audius API error: ${res.status}`);
    return await res.json();
  } catch (err) {
    clearTimeout(timeout);
    throw err;
  }
}

function normalizeTrack(track) {
  if (!track) return null;
  
  const artwork = track.artwork?.['480x480'] || track.artwork?.['1000x1000'] || track.artwork?.['150x150'] || null;
  const artworkSmall = track.artwork?.['150x150'] || artwork;
  const streamUrl = `${DISCOVERY_URL}/v1/tracks/${track.id}/stream?app_name=${APP_NAME}`;
  
  return {
    id: `audius_${track.id}`,
    title: track.title || 'Unknown',
    artist: track.user?.name || 'Unknown Artist',
    album: '',
    artwork: artwork,
    artworkSmall: artworkSmall,
    duration: track.duration || 0,
    provider: 'audius',
    providerUrl: `https://audius.co/${track.user?.handle || ''}/${track.permalink || ''}`,
    playbackType: 'full',
    previewUrl: streamUrl,
    fullUrl: streamUrl,
    explicit: false,
    genre: track.genre || '',
    releaseDate: track.release_date || '',
    playCount: track.play_count || 0,
    favoriteCount: track.favorite_count || 0,
    repostCount: track.repost_count || 0
  };
}

async function search(query, limit = 25) {
  try {
    const data = await apiFetch('/v1/tracks/search', { query, limit });
    if (!data.data || !Array.isArray(data.data)) {
      return { tracks: [], error: null };
    }
    return {
      tracks: data.data.map(normalizeTrack).filter(Boolean),
      error: null
    };
  } catch (err) {
    console.error('Audius search error:', err.message);
    return { tracks: [], error: err.message };
  }
}

async function getTrending(limit = 25) {
  try {
    const data = await apiFetch('/v1/tracks/trending', { limit });
    if (!data.data || !Array.isArray(data.data)) {
      return { tracks: [], error: null };
    }
    return {
      tracks: data.data.map(normalizeTrack).filter(Boolean),
      error: null
    };
  } catch (err) {
    console.error('Audius trending error:', err.message);
    return { tracks: [], error: err.message };
  }
}

async function getUndergroundTrending(limit = 25) {
  try {
    const data = await apiFetch('/v1/tracks/trending/underground', { limit });
    if (!data.data || !Array.isArray(data.data)) {
      return { tracks: [], error: null };
    }
    return {
      tracks: data.data.map(normalizeTrack).filter(Boolean),
      error: null
    };
  } catch (err) {
    console.error('Audius underground trending error:', err.message);
    return { tracks: [], error: err.message };
  }
}

module.exports = { search, getTrending, getUndergroundTrending, name: 'Audius' };
// Jamendo API - Requires client_id
// https://developer.jamendo.com/v3.0
const fetch = require('node-fetch');

const BASE_URL = 'https://api.jamendo.com/v3.0';

let lastRequest = 0;
const MIN_INTERVAL = 300;

async function apiFetch(endpoint, params = {}) {
  const clientId = process.env.JAMENDO_CLIENT_ID;
  if (!clientId) {
    return { data: null, error: 'No Jamendo client ID configured' };
  }
  
  const now = Date.now();
  const wait = Math.max(0, MIN_INTERVAL - (now - lastRequest));
  if (wait > 0) await new Promise(r => setTimeout(r, wait));
  lastRequest = Date.now();
  
  const url = new URL(`${BASE_URL}${endpoint}`);
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('format', 'json');
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, String(v));
  }
  
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  
  try {
    const res = await fetch(url.toString(), { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) throw new Error(`Jamendo API error: ${res.status}`);
    return { data: await res.json(), error: null };
  } catch (err) {
    clearTimeout(timeout);
    return { data: null, error: err.message };
  }
}

function normalizeTrack(track) {
  if (!track) return null;
  return {
    id: `jamendo_${track.id}`,
    title: track.name || 'Unknown',
    artist: track.artist_name || 'Unknown Artist',
    album: track.album_name || '',
    artwork: track.album_image || track.image || null,
    artworkSmall: track.image || null,
    duration: Math.round(track.duration || 0),
    provider: 'jamendo',
    providerUrl: track.shareurl || track.audio || '',
    playbackType: 'full',
    previewUrl: track.audio || null,
    fullUrl: track.audio || null,
    explicit: false,
    genre: '',
    releaseDate: track.releasedate || '',
    license: track.license_ccurl || ''
  };
}

async function search(query, limit = 25) {
  try {
    const { data, error } = await apiFetch('/tracks/', {
      search: query,
      limit,
      audioformat: 'mp32',
      order: 'popularity_total',
      include: 'musicinfo'
    });
    
    if (error) return { tracks: [], error };
    if (!data?.results || !Array.isArray(data.results)) {
      return { tracks: [], error: null };
    }
    
    return {
      tracks: data.results.map(normalizeTrack).filter(Boolean),
      error: null
    };
  } catch (err) {
    console.error('Jamendo search error:', err.message);
    return { tracks: [], error: err.message };
  }
}

async function getNewReleases(limit = 25) {
  try {
    const { data, error } = await apiFetch('/tracks/', {
      limit,
      order: 'releasedate_desc',
      audioformat: 'mp32',
      include: 'musicinfo'
    });
    
    if (error) return { tracks: [], error };
    if (!data?.results || !Array.isArray(data.results)) {
      return { tracks: [], error: null };
    }
    
    return {
      tracks: data.results.map(normalizeTrack).filter(Boolean),
      error: null
    };
  } catch (err) {
    console.error('Jamendo new releases error:', err.message);
    return { tracks: [], error: err.message };
  }
}

async function getPopular(limit = 25) {
  try {
    const { data, error } = await apiFetch('/tracks/', {
      limit,
      order: 'popularity_total',
      audioformat: 'mp32',
      include: 'musicinfo'
    });
    
    if (error) return { tracks: [], error };
    if (!data?.results || !Array.isArray(data.results)) {
      return { tracks: [], error: null };
    }
    
    return {
      tracks: data.results.map(normalizeTrack).filter(Boolean),
      error: null
    };
  } catch (err) {
    console.error('Jamendo popular error:', err.message);
    return { tracks: [], error: err.message };
  }
}

function isConfigured() {
  return !!process.env.JAMENDO_CLIENT_ID;
}

module.exports = { search, getNewReleases, getPopular, isConfigured, name: 'Jamendo' };
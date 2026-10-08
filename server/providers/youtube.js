// YouTube Data API v3 - Requires API key
// https://developers.google.com/youtube/v3
const fetch = require('node-fetch');

const BASE_URL = 'https://www.googleapis.com/youtube/v3';

// Quota tracking
let dailyQuotaUsed = 0;
const DAILY_QUOTA_LIMIT = 9000; // Conservative limit (10000 is max)
let quotaResetDate = null;

function checkQuotaReset() {
  const today = new Date().toDateString();
  if (quotaResetDate !== today) {
    quotaResetDate = today;
    dailyQuotaUsed = 0;
  }
}

let lastRequest = 0;
const MIN_INTERVAL = 500;

async function apiFetch(endpoint, params = {}) {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    return { data: null, error: 'No YouTube API key configured' };
  }
  
  checkQuotaReset();
  if (dailyQuotaUsed >= DAILY_QUOTA_LIMIT) {
    return { data: null, error: 'YouTube daily quota limit reached' };
  }
  
  const now = Date.now();
  const wait = Math.max(0, MIN_INTERVAL - (now - lastRequest));
  if (wait > 0) await new Promise(r => setTimeout(r, wait));
  lastRequest = Date.now();
  
  const url = new URL(`${BASE_URL}${endpoint}`);
  url.searchParams.set('key', apiKey);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, String(v));
  }
  
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  
  try {
    const res = await fetch(url.toString(), { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      if (errData?.error?.errors?.[0]?.reason === 'quotaExceeded') {
        dailyQuotaUsed = DAILY_QUOTA_LIMIT;
        return { data: null, error: 'YouTube daily quota exceeded' };
      }
      throw new Error(`YouTube API error: ${res.status}`);
    }
    const data = await res.json();
    dailyQuotaUsed += 100; // Search costs ~100 units
    return { data, error: null };
  } catch (err) {
    clearTimeout(timeout);
    return { data: null, error: err.message };
  }
}

function normalizeTrack(video) {
  if (!video || !video.id?.videoId) return null;
  
  return {
    id: `youtube_${video.id.videoId}`,
    title: cleanTitle(video.snippet?.title || 'Unknown'),
    artist: video.snippet?.channelTitle || 'Unknown',
    album: '',
    artwork: video.snippet?.thumbnails?.high?.url || video.snippet?.thumbnails?.medium?.url || null,
    artworkSmall: video.snippet?.thumbnails?.default?.url || null,
    duration: 0, // Would need additional API call
    provider: 'youtube',
    providerUrl: `https://www.youtube.com/watch?v=${video.id.videoId}`,
    playbackType: 'embedded',
    previewUrl: null,
    fullUrl: `https://www.youtube.com/watch?v=${video.id.videoId}`,
    videoId: video.id.videoId,
    explicit: false,
    genre: '',
    releaseDate: video.snippet?.publishedAt || ''
  };
}

function cleanTitle(title) {
  // Remove common YouTube suffixes
  return title
    .replace(/\s*\(Official\s*(Music)?\s*Video\)/i, '')
    .replace(/\s*\(Official\s*Audio\)/i, '')
    .replace(/\s*\(Lyric\s*Video\)/i, '')
    .replace(/\s*\(Visualizer\)/i, '')
    .replace(/\s*\[Official\s*(Music)?\s*Video\]/i, '')
    .replace(/\s*\(HD\)/i, '')
    .replace(/\s*\(4K\)/i, '')
    .trim();
}

async function search(query, limit = 10) {
  try {
    const { data, error } = await apiFetch('/search', {
      part: 'snippet',
      q: query,
      type: 'video',
      videoCategoryId: '10', // Music
      maxResults: String(limit),
      safeSearch: 'none'
    });
    
    if (error) return { tracks: [], error, quotaRemaining: DAILY_QUOTA_LIMIT - dailyQuotaUsed };
    if (!data?.items || !Array.isArray(data.items)) {
      return { tracks: [], error: null, quotaRemaining: DAILY_QUOTA_LIMIT - dailyQuotaUsed };
    }
    
    return {
      tracks: data.items.map(normalizeTrack).filter(Boolean),
      error: null,
      quotaRemaining: DAILY_QUOTA_LIMIT - dailyQuotaUsed
    };
  } catch (err) {
    console.error('YouTube search error:', err.message);
    return { tracks: [], error: err.message, quotaRemaining: DAILY_QUOTA_LIMIT - dailyQuotaUsed };
  }
}

function getQuotaStatus() {
  checkQuotaReset();
  return {
    used: dailyQuotaUsed,
    limit: DAILY_QUOTA_LIMIT,
    remaining: DAILY_QUOTA_LIMIT - dailyQuotaUsed,
    percentage: Math.round((dailyQuotaUsed / DAILY_QUOTA_LIMIT) * 100),
    configured: !!process.env.YOUTUBE_API_KEY
  };
}

function isConfigured() {
  return !!process.env.YOUTUBE_API_KEY;
}

module.exports = { search, getQuotaStatus, isConfigured, name: 'YouTube' };
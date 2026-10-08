// Provider registry and health tracking
const itunes = require('./itunes');
const deezer = require('./deezer');
const audius = require('./audius');
const jamendo = require('./jamendo');
const youtube = require('./youtube');

const providers = { itunes, deezer, audius, jamendo, youtube };

// Health tracking
const health = {
  itunes: { status: 'available', lastSuccess: null, lastFailure: null, failures: 0, cooldownUntil: 0 },
  deezer: { status: 'available', lastSuccess: null, lastFailure: null, failures: 0, cooldownUntil: 0 },
  audius: { status: 'available', lastSuccess: null, lastFailure: null, failures: 0, cooldownUntil: 0 },
  jamendo: { status: jamendo.isConfigured() ? 'available' : 'unconfigured', lastSuccess: null, lastFailure: null, failures: 0, cooldownUntil: 0 },
  youtube: { status: youtube.isConfigured() ? 'available' : 'unconfigured', lastSuccess: null, lastFailure: null, failures: 0, cooldownUntil: 0 }
};

const COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes
const MAX_FAILURES = 3;

function recordSuccess(providerName) {
  if (health[providerName]) {
    health[providerName].status = 'available';
    health[providerName].lastSuccess = Date.now();
    health[providerName].failures = 0;
    health[providerName].cooldownUntil = 0;
  }
}

function recordFailure(providerName) {
  if (health[providerName]) {
    health[providerName].lastFailure = Date.now();
    health[providerName].failures++;
    if (health[providerName].failures >= MAX_FAILURES) {
      health[providerName].status = 'cooldown';
      health[providerName].cooldownUntil = Date.now() + COOLDOWN_MS;
    }
  }
}

function isAvailable(providerName) {
  const h = health[providerName];
  if (!h) return false;
  if (h.status === 'unconfigured') return false;
  if (h.status === 'cooldown' && Date.now() > h.cooldownUntil) {
    h.status = 'available';
    h.failures = 0;
  }
  return h.status === 'available';
}

function getHealthStatus() {
  const result = {};
  for (const [name, h] of Object.entries(health)) {
    let status = h.status;
    if (status === 'cooldown' && Date.now() > h.cooldownUntil) {
      status = 'available';
    }
    
    const notConfigured = (name === 'jamendo' && !jamendo.isConfigured()) ||
                          (name === 'youtube' && !youtube.isConfigured());
    
    if (notConfigured) status = 'unconfigured';
    
    const reasons = {
      jamendo: 'Requires JAMENDO_CLIENT_ID',
      youtube: 'Requires YOUTUBE_API_KEY'
    };
    
    result[name] = {
      status,
      configured: !notConfigured,
      reason: notConfigured ? reasons[name] || 'Not configured' : null,
      lastSuccess: h.lastSuccess,
      lastFailure: h.lastFailure,
      failures: h.failures
    };
  }
  
  // Add YouTube quota info
  if (youtube.isConfigured()) {
    result.youtube.quota = youtube.getQuotaStatus();
  }
  
  return result;
}

module.exports = {
  providers,
  health,
  recordSuccess,
  recordFailure,
  isAvailable,
  getHealthStatus
};
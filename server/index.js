require('dotenv').config();
const express = require('express');
const path = require('path');
const compression = require('compression');
const cors = require('cors');

const searchRoute = require('./routes/search');
const discoverRoute = require('./routes/discover');
const providersRoute = require('./routes/providers');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(compression());
app.use(cors());
app.use(express.json());

// Serve static files
app.use(express.static(path.join(__dirname, '../public'), {
  maxAge: '1d',
  etag: true
}));

// API Routes
app.use('/api/search', searchRoute);
app.use('/api/discover', discoverRoute);
app.use('/api/providers', providersRoute);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('┌─────────────────────────────────────────────┐');
  console.log('│   Resonance Music Explorer                  │');
  console.log(`│   http://0.0.0.0:${PORT}                       │`);
  console.log('├─────────────────────────────────────────────┤');
  console.log('│  Provider Status:                           │');
  console.log('│                                             │');
  console.log('│  iTunes    ✓ Available (30-sec preview)     │');
  console.log('│  Deezer    ✓ Available (30-sec preview)     │');
  console.log(`│  Audius    ${process.env.AUDIUS_API_KEY ? '✓ Available (full song)        ' : '✓ Available (full song)        '}│`);
  console.log(`│  Jamendo   ${process.env.JAMENDO_CLIENT_ID ? '✓ Available (full song)        ' : '⚙ Setup required (JAMENDO_CLIENT_ID)'}│`);
  console.log(`│  YouTube   ${process.env.YOUTUBE_API_KEY ? '✓ Available (embedded playback) ' : '⚙ Setup required (YOUTUBE_API_KEY)  '}│`);
  console.log('│                                             │');
  if (!process.env.JAMENDO_CLIENT_ID || !process.env.YOUTUBE_API_KEY) {
    console.log('│  ℹ Some providers need credentials.         │');
    console.log('│  See SETUP.md for configuration guide.      │');
  }
  console.log('└─────────────────────────────────────────────┘');
  console.log('');
});
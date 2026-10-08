# Resonance — Music Explorer

Multi-source music discovery and playback with dynamic artwork-driven visuals, playlists, queue management, and a customizable atmosphere.

Search once. Discover everywhere. Listen to what's actually available.

---

## Overview

Resonance aggregates music search results from five different services into one unified interface. Instead of searching Spotify, YouTube, Deezer, Audius, and iTunes separately, you search once and get combined results — each clearly labeled by source and playback type.

When you play a track, the application automatically selects the best available source: full songs from Audius or Jamendo first, embedded YouTube playback second, and 30-second previews from iTunes or Deezer as fallback.

The visual environment responds to the currently playing track — album artwork colors drive ambient backgrounds, gradient animations, and a canvas-based visualizer.

## Features

### Discovery
- Multi-provider unified music search
- Progressive results as providers respond
- Audius trending charts
- Deezer global charts
- Jamendo new releases
- Search history with one-click replay
- Provider status panel with health indicators

### Playback
- Full-track streaming (Audius, Jamendo)
- 30-second preview playback (iTunes, Deezer)
- Embedded YouTube video playback
- Unified player with play / pause / next / previous
- Seek bar with elapsed and remaining time
- Volume control with mute toggle
- Shuffle and repeat (off / all / one)
- Sleep timer (5 / 10 / 15 / 30 / 45 / 60 min, or end of track)
- Mini player with progress bar when full player is closed
- Full-screen now-playing view with large artwork
- Media Session API integration (lock screen controls on mobile)

### Queue
- Add to queue, play next
- Remove individual tracks
- Clear entire queue
- Shuffle queue
- Automatic advancement when a track ends
- Graceful skip on playback failure

### Library
- Favorites with one-click toggle
- Recently played history (up to 50 tracks)
- Create, rename, delete playlists
- Add / remove tracks from playlists
- Play entire playlist or shuffle it
- Export library as JSON
- Import library with validation

### Visual Experience
- Album artwork color extraction
- Dynamic music-driven palette
- Animated ambient background orbs
- Canvas-based visualizer with five modes: ambient, wave, spectrum, pulse, minimal
- Smooth color transitions between tracks
- Reduced-motion support via `prefers-reduced-motion`

### Customization
- Three themes: Dark, Light, AMOLED
- 18 accent colors: violet, indigo, blue, sky, cyan, teal, emerald, green, lime, yellow, amber, orange, red, rose, pink, fuchsia, coral, slate
- Ambient background toggle
- Visualizer mode selector
- Compact mode for denser layouts
- Volume and preferences persist across sessions

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Space` | Play / Pause |
| `←` | Previous track |
| `→` | Next track |
| `↑` | Volume up |
| `↓` | Volume down |
| `M` | Mute / unmute |
| `F` | Favorite current track |
| `Q` | Toggle queue panel |
| `/` | Focus search bar |
| `Esc` | Close open panels |

---

## Music Providers

| Provider | Search | Playback | API Key Required |
|----------|--------|----------|-----------------|
| **iTunes** | ✓ | 30-sec preview | No |
| **Deezer** | ✓ | 30-sec preview | No |
| **Audius** | ✓ | Full song | No |
| **Jamendo** | ✓ | Full song (MP3) | `JAMENDO_CLIENT_ID` |
| **YouTube** | ✓ | Embedded video | `YOUTUBE_API_KEY` |

Three providers work immediately with no configuration. Jamendo and YouTube require free API credentials — see [SETUP.md](SETUP.md) for step-by-step instructions.

Provider failures are fully isolated: if one service goes down or hits a rate limit, the rest of the application continues working normally.

---

## Tech Stack

- **Runtime:** Node.js
- **Server:** Express.js (API proxy, static file serving)
- **Frontend:** Vanilla JavaScript (ES modules, no framework)
- **Styling:** Custom CSS with design tokens (CSS custom properties)
- **Build:** None required — runs directly
- **Storage:** localStorage for user data (favorites, playlists, settings)

No React, no TypeScript, no Tailwind, no bundler. The application runs with a single `node` command.

---

## Architecture

```
Search Input
    ↓
Express API route (/api/search)
    ↓
Provider adapters (iTunes, Deezer, Audius, Jamendo, YouTube)
    ↓  Promise.allSettled — one failure does not affect others
Response normalization → unified track model
    ↓
Frontend renders unified results
    ↓
User selects track → Player.play()
    ↓
Playback priority: Audius > Jamendo > YouTube > iTunes > Deezer
    ↓
Dynamic palette ← ColorEngine extracts colors from artwork
    ↓
Ambient orbs + visualizer respond to active track
```

### Project Structure

```
server/
  index.js                 Express server, routes, static serving
  providers/
    itunes.js              iTunes Search API adapter (no key)
    deezer.js              Deezer public API adapter (no key)
    audius.js              Audius discovery API adapter (no key)
    jamendo.js             Jamendo v3 API adapter (client_id)
    youtube.js             YouTube Data API v3 adapter (api_key)
    index.js               Provider registry + health tracking
  routes/
    search.js              Aggregated search endpoint
    discover.js            Trending / charts / new releases
    providers.js           Provider health status API

public/
  index.html               Single-page application shell
  css/
    design-system.css      Tokens, typography, themes, colors
    layout.css             App layout, sidebar, navigation
    components.css         Track items, cards, badges, forms, modals
    player.css             Mini player, full player, controls
    responsive.css         Mobile and tablet breakpoints
  js/
    utils/
      helpers.js           Formatting, debounce, event bus, artwork rendering
      store.js             State management + localStorage persistence
      color.js             Album art color extraction engine
      visualizer.js        Canvas-based audio visualizer
    providers/
      api.js               Frontend API client with abort support
    components/
      toast.js             Notification toast system
      tracks.js            Track and card rendering components
      pages.js             Page renderers (Discover, Search, Library, Playlists, Settings)
    player.js              Unified player (HTMLAudioElement + YouTube IFrame)
    router.js              Hash-based SPA router
    app.js                 Application bootstrap and global setup

.env.example               Environment variable template
SETUP.md                   Detailed provider configuration guide
```

---

## Getting Started

### Prerequisites

- **Node.js** v16 or later — [Download](https://nodejs.org)
- **npm** v7 or later (included with Node.js)

```bash
node --version   # v16+
npm --version    # v7+
```

### Install and run

```bash
git clone https://github.com/YOUR_USERNAME/resonance-music-explorer.git
cd resonance-music-explorer
npm install
cp .env.example .env
node server/index.js
```

Open `http://localhost:3000` in your browser.

The app works immediately with iTunes, Deezer, and Audius. No API keys needed for basic usage.

---

## Environment Variables

| Variable | Required | Description | Where to get it |
|----------|----------|-------------|----------------|
| `AUDIUS_API_KEY` | No | Audius API key (works without it) | [audius.org](https://audius.org) |
| `AUDIUS_APP_NAME` | No | Audius app identifier | Any string |
| `JAMENDO_CLIENT_ID` | For Jamendo | Jamendo API client ID | [developer.jamendo.com](https://developer.jamendo.com/v3.0) |
| `YOUTUBE_API_KEY` | For YouTube | YouTube Data API v3 key | [console.cloud.google.com](https://console.cloud.google.com) |
| `PORT` | No | Server port (default: 3000) | — |
| `NODE_ENV` | No | Environment mode | — |

All credentials are **server-side only**. They are read from `.env` by the Node.js server and never sent to the browser.

---

## Provider Setup

See **[SETUP.md](SETUP.md)** for complete step-by-step instructions covering:

- Jamendo developer account and client ID setup
- YouTube API key creation and quota management
- VS Code project setup
- Troubleshooting for every common issue

---

## Customization

Access settings via the gear icon in the sidebar or navigate to Settings.

**Themes:** Dark · Light · AMOLED

**Accent colors:** 18 options from violet to slate

**Visualizer modes:** Ambient · Wave · Spectrum · Pulse · Minimal · Off

**Ambient background:** Toggle the animated color orbs that respond to the current track

**Preferences persist** in localStorage across sessions.

---

## Troubleshooting

**No sound:** Open the app in a real browser tab, not inside a sandboxed iframe. Click a track — the first click unlocks audio playback. Check the browser console for errors.

**Jamendo/YouTube not working:** These require API credentials. See [SETUP.md](SETUP.md).

**Provider shows "Setup required":** The corresponding API key is missing from `.env`. Add it and restart the server.

**Port 3000 in use:** Change `PORT=3001` in `.env` and restart.

---

## License

No license has been chosen for this project yet.

The application connects to third-party music services. Respect each provider's terms of service. The application does not download, cache, or redistribute copyrighted audio.
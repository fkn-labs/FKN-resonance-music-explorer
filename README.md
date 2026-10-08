# Resonance — Music Explorer

**Search once. Discover everywhere. Listen to what's actually available.**

Resonance is a multi-source music explorer that brings music discovery, playback, playlists, queue management, and dynamic music-driven visuals into one experience.

## Features

* **Unified music search** across multiple providers
* **Smart playback** with full tracks, previews, and YouTube playback
* **Favorites and recently played** tracks
* **Playlists** with import/export support
* **Queue management** with shuffle, repeat, and play-next
* **Artwork-driven visuals** with dynamic colors and ambient backgrounds
* **Audio visualizer** with multiple visual modes
* **Custom themes** with Dark, Light, and AMOLED modes
* **Keyboard shortcuts** for playback and navigation
* **Responsive interface** for desktop, tablet, and mobile

## Music Sources

| Provider    | Search | Playback       |
| ----------- | ------ | -------------- |
| **iTunes**  | Yes    | 30-sec preview |
| **Deezer**  | Yes    | 30-sec preview |
| **Audius**  | Yes    | Full song      |
| **Jamendo** | Yes    | Full song      |
| **YouTube** | Yes    | Embedded video |

iTunes, Deezer, and Audius work without additional API configuration. Jamendo and YouTube require API credentials.

## Tech Stack

**Node.js · Express.js · Vanilla JavaScript · Custom CSS · localStorage**

No React, TypeScript, Tailwind, or bundler.

## Getting Started

### Requirements

* Node.js 16+
* npm 7+

### Installation

```bash
git clone https://github.com/YOUR_USERNAME/resonance-music-explorer.git
cd resonance-music-explorer
npm install
cp .env.example .env
```

Add any required API credentials to `.env`, then start the server:

```bash
node server/index.js
```

Open **http://localhost:3000** in your browser.

## Personalization

Resonance lets you customize your listening experience with:

* Dark, Light, and AMOLED themes
* Multiple accent colors
* Dynamic ambient backgrounds
* Ambient, Wave, Spectrum, Pulse, and Minimal visualizers
* Compact layout
* Persistent preferences

## Playback

When possible, Resonance prioritizes higher-quality playback sources:

**Audius → Jamendo → YouTube → iTunes → Deezer**

If a provider is unavailable, the application can fall back to another available source instead of stopping the entire experience.

## License

No license has been chosen for this project yet.

Resonance connects to third-party music services and respects their respective terms of service. It does not download, cache, or redistribute copyrighted audio.

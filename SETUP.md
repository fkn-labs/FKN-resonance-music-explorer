# Resonance Music Explorer — Setup Guide

A multi-source music discovery application that searches iTunes, Deezer, Audius, Jamendo, and YouTube from one interface.

---

## Quick Start (works immediately, no credentials needed)

Three providers work out of the box with no API keys:

| Provider | Playback | Key Required |
|----------|----------|--------------|
| **iTunes** | 30-second preview | No |
| **Deezer** | 30-second preview | No |
| **Audius** | Full song (streaming) | No |

```bash
npm install
node server/index.js
```

Open `http://localhost:3000` — you can search and play music immediately.

---

## Prerequisites

| Tool | Required | Check |
|------|----------|-------|
| **Node.js** (v16+) | Yes | `node --version` |
| **npm** (v7+) | Yes | `npm --version` |

That's it. No database, no Python, no Docker.

---

## VS Code Setup

### 1. Install Node.js

Download from https://nodejs.org (LTS version).

Verify in VS Code's integrated terminal (`Ctrl+` or `Cmd+`):

```bash
node --version    # Should print v16.x.x or higher
npm --version     # Should print 7.x.x or higher
```

### 2. Open the project

- Open VS Code
- **File → Open Folder** → select the project folder
- Open the terminal: **Terminal → New Terminal** (or `` Ctrl+` ``)

### 3. Install dependencies

```bash
npm install
```

### 4. Configure environment variables

```bash
cp .env.example .env
```

This creates your local `.env` file. The app works without editing it, using the three free providers.

To enable Jamendo or YouTube, edit `.env` and add your credentials (see below).

### 5. Start the application

```bash
node server/index.js
```

### 6. Open in browser

```
http://localhost:3000
```

### 7. Verify everything works

```
[ ] Application loads at http://localhost:3000
[ ] Discover page shows Audius Trending and Deezer Charts
[ ] Search returns results from iTunes, Deezer, Audius
[ ] Click a track — playback starts (30-sec preview or full song)
[ ] Provider status panel shows each provider's state
[ ] Keyboard shortcuts work (Space = play/pause, / = search)
[ ] Favorites persist after page reload
```

---

## Enabling Jamendo (free, Creative Commons music)

Jamendo provides free, legal, full-length music under Creative Commons licenses. Playback is direct MP3 streaming — no embedded player needed.

### Step 1: Create a Jamendo developer account

Go to: **https://developer.jamendo.com/v3.0**

Click **Sign Up** (or log in if you have an account).

### Step 2: Create an application

1. After logging in, go to **My Apps** (or **Create New App**)
2. Fill in:
   - **App name**: `Music Explorer` (or anything you like)
   - **Description**: `Music discovery application`
   - **Website**: `http://localhost:3000` (for development)
3. Submit the form

### Step 3: Copy your Client ID

After creating the app, you'll see a **Client ID** string. Copy it.

### Step 4: Add to `.env`

Open `.env` in VS Code and find this line:

```env
JAMENDO_CLIENT_ID=
```

Paste your value:

```env
JAMENDO_CLIENT_ID=your_actual_client_id_here
```

### Step 5: Restart the server

In the VS Code terminal, stop the server with `Ctrl+C`, then:

```bash
node server/index.js
```

You should now see:

```
Jamendo   ✓ Available (full song)
```

### Step 6: Verify

1. Search for a track (try "jazz" or "piano")
2. Open the provider status panel (top-right icon)
3. Jamendo should show **Available** with a purple-orange badge
4. Jamendo results should appear with the **JAMENDO** badge and **Full song** indicator

---

## Enabling YouTube (search + embedded playback)

YouTube works differently from other providers:
- **Search** uses the YouTube Data API v3 (requires a server-side API key)
- **Playback** uses the YouTube IFrame Player API (browser-side, no key needed)

The API key is used **only for search** and lives on the server — it is never sent to the browser.

YouTube is intentionally not auto-searched on every query (to conserve API quota). It is searched when:
- The user explicitly requests YouTube results
- The user clicks "Find full version" on a preview-only track

### Step 1: Go to Google Cloud Console

Open: **https://console.cloud.google.com**

Sign in with your Google account.

### Step 2: Create or select a project

1. Click the project dropdown (top bar, near the Google Cloud logo)
2. Click **New Project**
3. Name it `Music Explorer` (or anything)
4. Click **Create**
5. Select the new project

### Step 3: Enable the YouTube Data API v3

1. In the left sidebar, go to **APIs & Services → Library**
2. Search for **YouTube Data API v3**
3. Click on it, then click **Enable**

### Step 4: Create an API key

1. Go to **APIs & Services → Credentials**
2. Click **+ CREATE CREDENTIALS → API key**
3. Copy the key that appears

### Step 5: Restrict the API key (recommended)

1. Click on the API key you just created
2. Under **API restrictions**, select **Restrict key**
3. Select **YouTube Data API v3** from the list
4. Click **Save**

This prevents the key from being used with other Google APIs.

### Step 6: Add to `.env`

Open `.env` and find:

```env
YOUTUBE_API_KEY=
```

Paste your key:

```env
YOUTUBE_API_KEY=PASTE_YOUR_API_KEY_HERE
```

### Step 7: Restart the server

```bash
# Ctrl+C to stop, then:
node server/index.js
```

You should now see:

```
YouTube   ✓ Available (embedded playback)
```

### Step 8: Verify

1. Open the provider status panel — YouTube should show **Available**
2. Search for a track, then use the "Find full version" feature on a preview-only result
3. YouTube results should appear with the **YOUTUBE** badge and **Embedded playback** indicator
4. Playing a YouTube result opens an embedded video player

### YouTube Quota Notes

- YouTube Data API has a **10,000 units/day** free quota
- Each search costs approximately **100 units**
- The application tracks usage and stops searching YouTube at 9,000 units
- Quota resets at midnight Pacific Time
- The provider status panel shows remaining quota

### Production deployment

When deploying to a real domain:

1. In Google Cloud Console → **Credentials** → your API key
2. Under **Application restrictions**, add your production domain
3. Update `.env` on your server with the same key

---

## Provider Configuration Summary

| Provider | Credential | Environment Variable | Human Setup | Playback |
|----------|-----------|---------------------|-------------|----------|
| iTunes | None | — | No | 30-sec preview |
| Deezer | None | — | No | 30-sec preview |
| Audius | None (optional key) | `AUDIUS_API_KEY` | No | Full song |
| Jamendo | Client ID | `JAMENDO_CLIENT_ID` | **Yes** | Full song (MP3) |
| YouTube | API key | `YOUTUBE_API_KEY` | **Yes** | Embedded video |

---

## Troubleshooting

### "Jamendo shows Setup required" in provider status

**Cause**: `JAMENDO_CLIENT_ID` is not set in `.env`.

**Fix**:
1. Open `.env` in VS Code
2. Add your Jamendo Client ID (see Jamendo setup above)
3. Restart the server: `Ctrl+C` then `node server/index.js`

---

### "YouTube shows Setup required" in provider status

**Cause**: `YOUTUBE_API_KEY` is not set in `.env`.

**Fix**:
1. Open `.env` in VS Code
2. Add your YouTube API key (see YouTube setup above)
3. Restart the server

---

### YouTube search works but playback doesn't

YouTube **search** and YouTube **playback** are separate systems:

- Search uses the Data API v3 (your API key)
- Playback uses the IFrame Player API (loaded from youtube.com in the browser)

If search works but playback doesn't:
1. Check that your browser allows third-party iframes
2. Check that `https://www.youtube.com` is not blocked by an extension
3. Check the browser console for iframe errors

The YouTube player must remain visible per YouTube's terms — the application embeds it in a small corner player.

---

### YouTube quota exceeded

The application shows: `YouTube — Quota limited`

**Cause**: You've used more than ~9,000 API units today.

**Fix**: Wait until midnight Pacific Time for the quota to reset. The application automatically disables YouTube searches when quota is low.

---

### "Environment variables are undefined"

All provider credentials (`JAMENDO_CLIENT_ID`, `YOUTUBE_API_KEY`, etc.) are **server-side only**. They are read by Node.js from `.env` via `dotenv` and never sent to the browser.

Check:
1. The `.env` file exists in the project root (next to `package.json`)
2. Variable names match exactly (case-sensitive, no extra spaces)
3. You restarted the server after editing `.env`

---

### Port 3000 already in use

Another process is using port 3000.

**Option A**: Stop the other process:
```bash
# Find what's using port 3000
lsof -i :3000
# Kill it
kill <PID>
```

**Option B**: Use a different port in `.env`:
```env
PORT=3001
```

Then restart the server.

---

### Provider works locally but not in production

1. Set environment variables on your hosting platform (not just in `.env`)
2. For YouTube: add your production domain to the API key restrictions in Google Cloud Console
3. For Jamendo: update your Jamendo app's website URL to your production domain
4. Redeploy the application

---

### "Something went wrong in the interface"

This should not appear with the current codebase. If it does:

1. Open the browser console (`F12` → Console tab)
2. Look for red error messages
3. Check the server terminal for error logs
4. Most likely cause: a provider returned an unexpected response shape, which is now handled by per-provider error isolation

---

## Architecture Notes

```
server/
  index.js              Express server, serves API + static files
  providers/
    itunes.js           iTunes Search API (no key)
    deezer.js           Deezer public API (no key)
    audius.js           Audius discovery API (no key)
    jamendo.js          Jamendo v3 API (client_id required)
    youtube.js          YouTube Data API v3 (api_key required)
    index.js            Provider registry + health tracking
  routes/
    search.js           Aggregated search endpoint
    discover.js         Trending/charts/new releases
    providers.js        Provider health status API

public/
  index.html            Single-page application shell
  css/
    design-system.css   Tokens, typography, themes
    layout.css          App layout, sidebar, navigation
    components.css      Track items, cards, badges, forms
    player.css          Mini player, full player, controls
    responsive.css      Mobile breakpoints
  js/
    utils/
      helpers.js        Formatting, debounce, event bus
      store.js          State management + localStorage
      color.js          Album art color extraction
      visualizer.js     Audio visualizer (canvas)
    providers/
      api.js            Frontend API client
    components/
      toast.js          Notification toasts
      tracks.js         Track rendering components
      pages.js          Page renderers (Discover, Search, Library, etc.)
    player.js           Unified player (audio + YouTube)
    router.js           Hash-based SPA router
    app.js              Main application bootstrap
```

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Space` | Play / Pause |
| `←` | Previous track |
| `→` | Next track |
| `↑` | Volume up |
| `↓` | Volume down |
| `M` | Mute / Unmute |
| `F` | Favorite current track |
| `Q` | Toggle queue panel |
| `/` | Focus search bar |
| `Esc` | Close open panels |

---

## License

This application connects to third-party music services. Respect each provider's terms of service.

- **iTunes / Deezer**: 30-second previews for discovery purposes
- **Audius**: Full streaming via public API (artist-uploaded content)
- **Jamendo**: Full Creative Commons–licensed music
- **YouTube**: Embedded playback via official IFrame Player API

The application does not download, cache, or redistribute copyrighted audio.
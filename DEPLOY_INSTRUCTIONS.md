# BeatWrap - Complete Working Deployment Guide

## What You're Getting

A complete React app with:
- ✅ Weekly Wrapped (top tracks, artists, genres, listening by day)
- ✅ Top Track/Artist Right Now
- ✅ Mood Logging (6 emojis)
- ✅ Refresh Button (5/day limit)
- ✅ Export Data
- ✅ PKCE OAuth (no backend needed)
- ✅ All environment variables properly configured

---

## Quick Start (5 minutes)

### 1. Extract & Configure

```bash
unzip beatwrap-react-FIXED.zip
cd beatwrap-react-FIXED
cp .env.example .env
```

Edit `.env`:
```
REACT_APP_SPOTIFY_CLIENT_ID=YOUR_ACTUAL_CLIENT_ID_HERE
REACT_APP_REDIRECT_URI=http://localhost:3000/callback
```

### 2. Test Locally

```bash
npm install
npm start
```

Open http://localhost:3000 - login should work!

### 3. Deploy to Render

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin YOUR_GITHUB_REPO_URL
git push -u origin main
```

Go to https://render.com:
1. New → Static Site
2. Connect your repo
3. Settings:
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `build`
4. Environment Variables (ADD THESE!):
   ```
   REACT_APP_SPOTIFY_CLIENT_ID=your_client_id
   REACT_APP_REDIRECT_URI=https://your-app.onrender.com/callback
   ```
5. Create Static Site

### 4. Update Spotify Dashboard

https://developer.spotify.com/dashboard → Your App → Settings

Add these redirect URIs (both!):
```
http://localhost:3000/callback
https://your-app.onrender.com/callback
```

Click **Save**.

---

## File Structure

```
beatwrap-react-FIXED/
├── public/
│   ├── index.html
│   └── _redirects          ← Critical for routing
├── src/
│   ├── components/
│   │   ├── Login.js
│   │   ├── Callback.js
│   │   └── Wrapped.js
│   ├── spotify.js          ← Fixed env vars (process.env)
│   ├── helpers.js
│   ├── App.js
│   ├── App.css
│   └── index.js
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

---

## The Fix

Your original config had:
```javascript
// ❌ WRONG - literal string
SPOTIFY_CLIENT_ID: 'REACT_APP_SPOTIFY_CLIENT_ID',
```

Fixed version has:
```javascript
// ✅ CORRECT - reads from environment
const CLIENT_ID = process.env.REACT_APP_SPOTIFY_CLIENT_ID;
```

---

## Troubleshooting

### "Invalid client" error
→ Check `.env` file has your actual Client ID (no quotes, no spaces)

### "Redirect URI mismatch"
→ Spotify Dashboard URIs must EXACTLY match:
- Local: `http://localhost:3000/callback`
- Production: `https://your-app.onrender.com/callback`

### "Not Found" on /callback
→ Make sure `public/_redirects` file exists with:
```
/*    /index.html   200
```

### Environment variables not working on Render
→ Set them in Render Dashboard → Environment tab → Add Variables
→ Then trigger a new deploy (Manual Deploy button)

---

## Important Notes

1. **_redirects file** - Must be in `public/` folder. This tells Render to route all requests to index.html so React Router works.

2. **Environment Variables** - Must be set BEFORE build runs. If you add them after first deploy, click "Manual Deploy" to rebuild.

3. **No Backend Needed** - This uses PKCE OAuth, so everything is client-side. Your Spotify Client Secret is never used.

4. **Refresh Limit** - 5 per day, stored in localStorage, resets at midnight.

5. **Data Storage** - Everything in localStorage. Export button downloads JSON.

---

## Success Checklist

Before declaring victory, verify:

- [ ] Local login works (http://localhost:3000)
- [ ] Can see your wrapped data
- [ ] Mood logging works
- [ ] Refresh button works (shows remaining count)
- [ ] Export downloads JSON file
- [ ] Production login works (https://your-app.onrender.com)
- [ ] Callback redirects properly
- [ ] No errors in browser console (F12)

---

## Support

If still not working:
1. Open browser console (F12)
2. Check for red errors
3. Look for "BeatWrap Config" log - should show your Client ID
4. Send me the errors

The issue is ALWAYS one of:
- Wrong environment variable format
- Missing `_redirects` file
- Spotify Dashboard redirect URI mismatch
- Env vars not set before build

# BeatWrap - React

Complete React app for weekly Spotify wrapped with mood logging. Ready for Render deployment.

## ✅ All Features

- **Weekly Wrapped** — Top 10 tracks, top 8 artists, genre breakdown, listening by day
- **Top Track Now** — Your #1 track this month
- **Top Artist Now** — Your #1 artist this month  
- **Mood Logging** — 6 emoji system (😔😐🙂😄🔥😤) + optional note
- **Refresh Button** — 5 refreshes per day limit
- **Export Data** — Download all wraps + moods as JSON
- **PKCE OAuth** — No backend needed
- **Local Storage** — All data stays on your device

---

## 🚀 Quick Start

### 1. Get Spotify Client ID

1. Go to https://developer.spotify.com/dashboard
2. Create app
3. Add redirect URI: `http://localhost:3000/callback`
4. Copy your Client ID

### 2. Configure

```bash
cp .env.example .env
```

Edit `.env`:
```
REACT_APP_SPOTIFY_CLIENT_ID=paste_your_client_id_here
REACT_APP_REDIRECT_URI=http://localhost:3000/callback
```

### 3. Run

```bash
npm install
npm start
```

Open http://localhost:3000

---

## 📦 Deploy to Render

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/yourusername/beatwrap.git
git push -u origin main
```

### 2. Create Render Static Site

1. Go to https://render.com → New → Static Site
2. Connect your GitHub repo
3. Settings:
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `build`
4. **Environment Variables**:
   ```
   REACT_APP_SPOTIFY_CLIENT_ID=your_client_id
   REACT_APP_REDIRECT_URI=https://your-app.onrender.com/callback
   ```

### 3. Update Spotify Dashboard

Add production redirect URI:
```
https://your-app.onrender.com/callback
```

Must be exact match. Click Save.

---

## 🔧 Troubleshooting

### "Invalid client"
→ Check `.env` has actual Client ID (no quotes, no spaces)

### "Redirect URI mismatch"
→ Spotify Dashboard URI must EXACTLY match:
  - Local: `http://localhost:3000/callback`
  - Prod: `https://your-app.onrender.com/callback`

### "Not Found" on /callback
→ `public/_redirects` file must exist with: `/*    /index.html   200`

### Environment variables not working
→ Set in Render Dashboard → Environment → Add
→ Then click "Manual Deploy" to rebuild

---

## 📁 Project Structure

```
beatwrap/
├── public/
│   ├── index.html
│   └── _redirects          ← Critical for React Router
├── src/
│   ├── components/
│   │   ├── Login.js
│   │   ├── Callback.js
│   │   └── Wrapped.js      ← Main app
│   ├── spotify.js          ← Spotify API + PKCE + refresh limit
│   ├── helpers.js          ← Utilities
│   ├── App.js
│   ├── App.css
│   └── index.js
├── .env.example
├── package.json
└── README.md
```

---

## 🎯 How It Works

1. **PKCE OAuth** — Frontend generates code challenge, exchanges for token (no secret needed)
2. **Refresh Limit** — Tracks 5 refreshes per day in localStorage, resets at midnight
3. **Data Storage** — All localStorage keys prefixed with `bw_`
4. **Auto Token Refresh** — Handles expired tokens automatically

---

## ✅ Pre-Deploy Checklist

- [ ] Local login works
- [ ] Can see wrapped data
- [ ] Mood logging works
- [ ] Refresh button shows remaining count
- [ ] Export downloads JSON
- [ ] No console errors (F12)
- [ ] Both redirect URIs added to Spotify Dashboard
- [ ] Environment variables set in Render

---

## 📝 Notes

- **No backend** — Everything client-side
- **Free tier** — Render gives 750 hours/month free
- **Auto-deploy** — Push to GitHub → Render rebuilds
- **Refresh limit** — Resets daily at midnight
- **Data export** — Downloads JSON with all wraps + moods

---

## License

MIT

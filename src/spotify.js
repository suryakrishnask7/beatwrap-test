// ================================
// Environment
// ================================
const CLIENT_ID = process.env.REACT_APP_SPOTIFY_CLIENT_ID;
const REDIRECT_URI = process.env.REACT_APP_REDIRECT_URI;
const SCOPES =
  'user-read-recently-played user-top-read user-read-private user-read-email';

// ================================
// Storage helpers
// ================================
export const storage = {
  get: (k) => localStorage.getItem(`bw_${k}`),
  set: (k, v) => localStorage.setItem(`bw_${k}`, v),
  del: (k) => localStorage.removeItem(`bw_${k}`),
  isLoggedIn: () => {
    const token = localStorage.getItem('bw_access_token');
    const expires = parseInt(localStorage.getItem('bw_token_expires') || '0');
    return !!token && Date.now() < expires;
  },
};

// ================================
// Daily refresh limiter
// ================================
export const checkRefreshLimit = () => {
  const today = new Date().toISOString().split('T')[0];
  const date = storage.get('refresh_date');
  const count = parseInt(storage.get('refresh_count') || '0');

  if (date !== today) {
    storage.set('refresh_date', today);
    storage.set('refresh_count', '0');
    return { allowed: true, remaining: 5 };
  }

  if (count >= 5) return { allowed: false, remaining: 0 };
  return { allowed: true, remaining: 5 - count };
};

export const incrementRefreshCount = () => {
  const count = parseInt(storage.get('refresh_count') || '0');
  storage.set('refresh_count', String(count + 1));
};

export const getRefreshesRemaining = () => {
  const today = new Date().toISOString().split('T')[0];
  const date = storage.get('refresh_date');
  const count = parseInt(storage.get('refresh_count') || '0');
  if (date !== today) return 5;
  return Math.max(0, 5 - count);
};

// ================================
// PKCE helpers
// ================================
const base64url = (bytes) =>
  btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

const sha256 = async (plain) => {
  const data = new TextEncoder().encode(plain);
  return new Uint8Array(await crypto.subtle.digest('SHA-256', data));
};

const generatePKCE = async () => {
  const verifier = base64url(crypto.getRandomValues(new Uint8Array(64)));
  const challenge = base64url(await sha256(verifier));
  return { verifier, challenge };
};

// ================================
// Login
// ================================
export const initiateLogin = async () => {
  const { verifier, challenge } = await generatePKCE();
  const state = base64url(crypto.getRandomValues(new Uint8Array(16)));

  sessionStorage.setItem('bw_pkce_verifier', verifier);
  sessionStorage.setItem('bw_pkce_state', state);

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: 'code',
    redirect_uri: REDIRECT_URI,
    scope: SCOPES,
    state,
    code_challenge_method: 'S256',
    code_challenge: challenge,
  });

  window.location.href =
    `https://accounts.spotify.com/authorize?${params.toString()}`;
};

// ================================
// Callback
// ================================
export const handleCallback = async (code, returnedState) => {
  const expectedState = sessionStorage.getItem('bw_pkce_state');
  if (expectedState && returnedState !== expectedState) {
    throw new Error('State mismatch');
  }

  const verifier = sessionStorage.getItem('bw_pkce_verifier');
  if (!verifier) throw new Error('Missing PKCE verifier');

  const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI,
      code_verifier: verifier,
    }),
  });

  const tokenData = await tokenRes.json();
  if (tokenData.error) {
    throw new Error(tokenData.error_description || tokenData.error);
  }

  const profileRes = await fetch('https://api.spotify.com/v1/me', {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });

  const profile = await profileRes.json();

  storage.set('access_token', tokenData.access_token);
  storage.set('refresh_token', tokenData.refresh_token);
  storage.set('token_expires', Date.now() + tokenData.expires_in * 1000);
  storage.set('spotify_id', profile.id);
  storage.set('display_name', profile.display_name || profile.id);
  storage.set('profile_image', profile.images?.[0]?.url || '');

  sessionStorage.removeItem('bw_pkce_verifier');
  sessionStorage.removeItem('bw_pkce_state');

  return profile;
};

// ================================
// Token refresh
// ================================
const refreshToken = async () => {
  const refreshTok = storage.get('refresh_token');
  if (!refreshTok) return false;

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      grant_type: 'refresh_token',
      refresh_token: refreshTok,
    }),
  });

  const data = await res.json();
  if (!data.access_token) return false;

  storage.set('access_token', data.access_token);
  storage.set('token_expires', Date.now() + data.expires_in * 1000);
  if (data.refresh_token) storage.set('refresh_token', data.refresh_token);
  return true;
};

// ================================
// Spotify API wrapper
// ================================
export const spotifyCall = async (path) => {
  let token = storage.get('access_token');
  const expires = parseInt(storage.get('token_expires') || '0');

  if (Date.now() > expires - 60000) {
    const ok = await refreshToken();
    if (!ok) throw new Error('Session expired');
    token = storage.get('access_token');
  }

  const res = await fetch(`https://api.spotify.com/v1${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (res.status === 401) {
    const ok = await refreshToken();
    if (!ok) throw new Error('Session expired');
    return spotifyCall(path);
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Spotify error ${res.status}`);
  }

  return res.json();
};

// ================================
// Logout
// ================================
export const logout = () => {
  localStorage.clear();
  sessionStorage.clear();
  window.location.href = '/';
};

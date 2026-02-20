// CORRECTLY reading from environment variables
const CLIENT_ID = process.env.REACT_APP_SPOTIFY_CLIENT_ID;
const REDIRECT_URI = process.env.REACT_APP_REDIRECT_URI;
const SCOPES = 'user-read-recently-played user-top-read user-read-private user-read-email';

export const storage = {
  get: (k) => localStorage.getItem(`bw_${k}`),
  set: (k, v) => localStorage.setItem(`bw_${k}`, v),
  del: (k) => localStorage.removeItem(`bw_${k}`),
  isLoggedIn: () => {
    const token = localStorage.getItem('bw_access_token');
    const expires = parseInt(localStorage.getItem('bw_token_expires') || 0);
    return !!token && Date.now() < expires;
  },
};

export const checkRefreshLimit = () => {
  const today = new Date().toISOString().split('T')[0];
  const storedDate = storage.get('refresh_date');
  const storedCount = parseInt(storage.get('refresh_count') || '0');
  if (storedDate !== today) {
    storage.set('refresh_date', today);
    storage.set('refresh_count', '0');
    return { allowed: true, remaining: 5 };
  }
  if (storedCount >= 5) return { allowed: false, remaining: 0 };
  return { allowed: true, remaining: 5 - storedCount };
};

export const incrementRefreshCount = () => {
  const count = parseInt(storage.get('refresh_count') || '0');
  storage.set('refresh_count', String(count + 1));
};

export const getRefreshesRemaining = () => {
  const today = new Date().toISOString().split('T')[0];
  const storedDate = storage.get('refresh_date');
  const storedCount = parseInt(storage.get('refresh_count') || '0');
  if (storedDate !== today) return 5;
  return Math.max(0, 5 - storedCount);
};

const b64url = (input) => {
  const bytes = input instanceof ArrayBuffer ? new Uint8Array(input) : input;
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
};

export const generatePKCE = async () => {
  const verifier = b64url(crypto.getRandomValues(new Uint8Array(64)));
  const hashBuf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  const challenge = b64url(hashBuf);
  return { verifier, challenge };
};

export const initiateLogin = async () => {
  const { verifier, challenge } = await generatePKCE();
  const state = b64url(crypto.getRandomValues(new Uint8Array(16)));
  sessionStorage.setItem('bw_pkce_verifier', verifier);
  sessionStorage.setItem('bw_pkce_state', state);
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: 'code',
    redirect_uri: REDIRECT_URI,
    code_challenge_method: 'S256',
    code_challenge: challenge,
    state,
    scope: SCOPES,
    show_dialog: 'false',
  });
  window.location.href = `https://accounts.spotify.com/authorize?${params}`;
};

export const handleCallback = async (code, returnedState) => {
  const savedState = sessionStorage.getItem('bw_pkce_state');
  if (savedState && returnedState !== savedState) throw new Error('State mismatch');
  const verifier = sessionStorage.getItem('bw_pkce_verifier');
  if (!verifier) throw new Error('No verifier found');
  
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI,
      client_id: CLIENT_ID,
      code_verifier: verifier,
    }),
  });
  
  const data = await res.json();
  if (data.error) throw new Error(data.error_description || data.error);
  
  const profileRes = await fetch('https://api.spotify.com/v1/me', {
    headers: { Authorization: `Bearer ${data.access_token}` },
  });
  const profile = await profileRes.json();
  
  storage.set('access_token', data.access_token);
  storage.set('refresh_token', data.refresh_token);
  storage.set('token_expires', Date.now() + data.expires_in * 1000);
  storage.set('spotify_id', profile.id);
  storage.set('display_name', profile.display_name || profile.id);
  storage.set('profile_image', profile.images?.[0]?.url || '');
  
  sessionStorage.removeItem('bw_pkce_verifier');
  sessionStorage.removeItem('bw_pkce_state');
  
  return profile;
};

const refreshToken = async () => {
  const refreshTok = storage.get('refresh_token');
  if (!refreshTok) return false;
  
  try {
    const res = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshTok,
        client_id: CLIENT_ID,
      }),
    });
    
    const data = await res.json();
    if (data.access_token) {
      storage.set('access_token', data.access_token);
      storage.set('token_expires', Date.now() + data.expires_in * 1000);
      if (data.refresh_token) storage.set('refresh_token', data.refresh_token);
      return true;
    }
  } catch (e) {}
  return false;
};

export const spotifyCall = async (path) => {
  let token = storage.get('access_token');
  const expires = parseInt(storage.get('token_expires') || 0);
  
  if (Date.now() > expires - 60000) {
    const refreshed = await refreshToken();
    if (!refreshed) throw new Error('Session expired');
    token = storage.get('access_token');
  }
  
  const res = await fetch(`https://api.spotify.com/v1${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  
  if (res.status === 401) {
    const refreshed = await refreshToken();
    if (!refreshed) throw new Error('Session expired');
    return spotifyCall(path);
  }
  
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Spotify error ${res.status}`);
  }
  
  return res.json();
};

export const logout = () => {
  localStorage.clear();
  sessionStorage.clear();
  window.location.href = '/';
};

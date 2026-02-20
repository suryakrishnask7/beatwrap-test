import React from 'react';
import { initiateLogin } from '../spotify';

export default function Login() {
  const [loading, setLoading] = React.useState(false);
  
  const handleLogin = async () => {
    setLoading(true);
    try {
      await initiateLogin();
    } catch (err) {
      alert('Login failed: ' + err.message);
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px', minHeight: '100vh',
      backgroundImage: 'radial-gradient(ellipse 70% 50% at 50% 0%, rgba(29,185,84,0.07) 0%, transparent 60%)'
    }}>
      <div style={{ maxWidth: '400px', width: '100%', textAlign: 'center' }}>
        <div style={{
          width: '72px', height: '72px', margin: '0 auto 24px',
          background: 'linear-gradient(135deg, #1DB954, #0f7a35)',
          borderRadius: '20px', display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: '32px',
          boxShadow: '0 0 40px rgba(29,185,84,0.2)'
        }}>🎵</div>

        <h1 style={{
          fontSize: '44px', fontWeight: 800, letterSpacing: '-2px',
          background: 'linear-gradient(135deg, #fff 0%, rgba(255,255,255,0.65) 100%)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          marginBottom: '6px'
        }}>BeatWrap</h1>

        <p style={{
          fontSize: '12px', color: 'var(--muted2)', letterSpacing: '2.5px',
          textTransform: 'uppercase', marginBottom: '40px'
        }}>Wrapped In Your Rhythm</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '36px', textAlign: 'left' }}>
          <Feature icon="📊" title="Weekly Wrapped" desc="Top tracks, artists, and genres from the past week" />
          <Feature icon="🎭" title="Vibe Check" desc="Log your daily mood — helps train future AI features" />
          <Feature icon="🔒" title="Local Storage" desc="Everything stays on your device — no backend required" />
        </div>

        <button className="btn-primary" onClick={handleLogin} disabled={loading} style={{
          width: '100%', padding: '15px', display: 'flex',
          alignItems: 'center', justifyContent: 'center', gap: '12px'
        }}>
          {loading ? (
            <>
              <div style={{
                width: '16px', height: '16px', border: '2px solid rgba(0,0,0,0.2)',
                borderTopColor: '#000', borderRadius: '50%', animation: 'spin 0.7s linear infinite'
              }} />
              Redirecting…
            </>
          ) : (
            <>
              <svg style={{ width: '20px', height: '20px' }} viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
              </svg>
              Continue with Spotify
            </>
          )}
        </button>

        <p style={{ marginTop: '16px', fontSize: '11px', color: '#2a2a2a', lineHeight: 1.6 }}>
          By continuing you agree to BeatWrap reading your Spotify listening history. All data stays on your device.
        </p>
      </div>
    </div>
  );
}

function Feature({ icon, title, desc }) {
  return (
    <div style={{
      display: 'flex', gap: '14px', alignItems: 'flex-start',
      padding: '14px 16px', background: 'rgba(255,255,255,0.02)',
      border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px'
    }}>
      <div style={{ fontSize: '18px', flexShrink: 0, marginTop: '1px' }}>{icon}</div>
      <div>
        <strong style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '2px' }}>{title}</strong>
        <span style={{ fontSize: '12px', color: 'var(--muted2)', lineHeight: 1.4 }}>{desc}</span>
      </div>
    </div>
  );
}

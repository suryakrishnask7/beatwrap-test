import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { handleCallback } from '../spotify';

export default function Callback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const err = searchParams.get('error');

    if (err) {
      setError('Spotify returned: ' + err);
      return;
    }
    if (!code) {
      setError('No authorization code received.');
      return;
    }

    handleCallback(code, state)
      .then(() => setTimeout(() => navigate('/wrapped'), 700))
      .catch((e) => setError(e.message));
  }, [searchParams, navigate]);

  if (error) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '24px' }}>
        <div style={{ maxWidth: '380px', textAlign: 'center' }}>
          <div style={{ fontSize: '40px', marginBottom: '16px' }}>😕</div>
          <h2 style={{ marginBottom: '8px' }}>Authentication failed</h2>
          <p style={{ fontSize: '13px', color: 'var(--muted2)', marginBottom: '24px' }}>{error}</p>
          <a href="/" className="btn btn-primary" style={{ display: 'inline-flex', textDecoration: 'none' }}>
            ← Try again
          </a>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <div style={{ textAlign: 'center' }}>
        <div className="spinner" />
        <h2 style={{ marginTop: '16px' }}>Connecting to Spotify…</h2>
        <p style={{ fontSize: '13px', color: 'var(--muted2)', marginTop: '8px' }}>
          Exchanging your auth code for a token
        </p>
      </div>
    </div>
  );
}

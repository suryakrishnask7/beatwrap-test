import React from 'react';
import { useNavigate } from 'react-router-dom';
import { storage, spotifyCall, logout, checkRefreshLimit, incrementRefreshCount, getRefreshesRemaining } from '../spotify';
import { getWeekRange, formatDate, msToMin, saveWrappedData, saveMoodLog, getMoodLog, exportAllData } from '../helpers';

export default function Wrapped() {
  const navigate = useNavigate();
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  const [data, setData] = React.useState(null);
  const [selectedMood, setSelectedMood] = React.useState({ emoji: null, score: null });
  const [moodNote, setMoodNote] = React.useState('');
  const [moodSaved, setMoodSaved] = React.useState(false);
  const [toast, setToast] = React.useState({ show: false, message: '', green: false });
  const [refreshing, setRefreshing] = React.useState(false);
  const [refreshesLeft, setRefreshesLeft] = React.useState(5);

  const showToast = (message, green = false) => {
    setToast({ show: true, message, green });
    setTimeout(() => setToast({ show: false, message: '', green: false }), 2500);
  };

  const fetchData = React.useCallback(async () => {
    try {
      const { start, end, weekId } = getWeekRange();
      const [topTracksRes, topArtistsRes, recentRes] = await Promise.all([
        spotifyCall('/me/top/tracks?time_range=short_term&limit=20'),
        spotifyCall('/me/top/artists?time_range=short_term&limit=20'),
        spotifyCall('/me/player/recently-played?limit=50'),
      ]);

      const topTracks = topTracksRes.items || [];
      const topArtists = topArtistsRes.items || [];
      const recent = recentRes.items || [];
      const weekRecent = recent.filter(i => {
        const d = new Date(i.played_at);
        return d >= start && d <= end;
      });

      const uniqueArtists = new Set(weekRecent.map(i => i.track.artists[0]?.name)).size;
      const totalMs = weekRecent.reduce((s, i) => s + i.track.duration_ms, 0);

      const genreMap = {};
      topArtists.forEach(a => (a.genres || []).forEach(g => {
        genreMap[g] = (genreMap[g] || 0) + 1;
      }));
      const topGenres = Object.entries(genreMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([genre, count], _, arr) => ({
          genre, count, percentage: Math.round((count / arr[0][1]) * 100)
        }));

      const dayBreakdown = { Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0, Sun: 0 };
      const dayKeys = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      recent.forEach(i => {
        const k = dayKeys[new Date(i.played_at).getDay()];
        if (dayBreakdown[k] !== undefined) dayBreakdown[k]++;
      });

      const wrapData = {
        weekId, weekStart: start.toISOString(), weekEnd: end.toISOString(),
        weekRange: `${formatDate(start)} – ${formatDate(end)}  ·  ${weekId}`,
        topTracks: topTracks.slice(0, 10),
        topArtists: topArtists.slice(0, 8),
        topTrackNow: topTracks[0],
        topArtistNow: topArtists[0],
        topGenres,
        stats: {
          totalTracks: weekRecent.length || topTracks.length,
          uniqueArtists: uniqueArtists || topArtists.length,
          totalMinutes: Math.round(totalMs / 60000),
        },
        dayBreakdown,
      };

      saveWrappedData(weekId, wrapData);
      setData(wrapData);
      
      const today = new Date().toISOString().split('T')[0];
      const savedMood = getMoodLog(today);
      if (savedMood && savedMood.weekId === weekId) {
        setSelectedMood({ emoji: savedMood.emoji, score: savedMood.score });
        setMoodNote(savedMood.note || '');
      }
      
      setRefreshesLeft(getRefreshesRemaining());
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (!storage.isLoggedIn()) {
      navigate('/');
      return;
    }
    fetchData();
  }, [navigate, fetchData]);

  const handleRefresh = async () => {
    const { allowed, remaining } = checkRefreshLimit();
    if (!allowed) {
      showToast('Daily refresh limit reached (5/day). Try again tomorrow.');
      return;
    }
    setRefreshing(true);
    try {
      await fetchData();
      incrementRefreshCount();
      setRefreshesLeft(getRefreshesRemaining());
      showToast(`Refreshed! ${getRefreshesRemaining()} left today`, true);
    } catch (err) {
      showToast('Refresh failed: ' + err.message);
    }
    setRefreshing(false);
  };

  const handleSaveMood = () => {
    if (!selectedMood.emoji) {
      showToast('Pick an emoji first!');
      return;
    }
    const today = new Date().toISOString().split('T')[0];
    const moodData = {
      date: today, weekId: data.weekId,
      emoji: selectedMood.emoji, score: selectedMood.score,
      note: moodNote.substring(0, 280), loggedAt: new Date().toISOString(),
    };
    saveMoodLog(today, moodData);
    setMoodSaved(true);
    setTimeout(() => setMoodSaved(false), 3000);
    showToast('Vibe saved ✓', true);
  };

  const handleExport = () => {
    const exported = exportAllData();
    const blob = new Blob([JSON.stringify(exported, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `beatwrap-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Data exported ✓', true);
  };

  if (loading) {
    return (
      <div className="loader-overlay">
        <div className="spinner" />
        <div style={{ fontSize: '14px', color: 'var(--muted2)' }}>Fetching your data…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ maxWidth: '380px', margin: '80px auto', textAlign: 'center', padding: '24px' }}>
        <div style={{ fontSize: '40px', marginBottom: '16px' }}>😕</div>
        <h2 style={{ marginBottom: '8px' }}>Something went wrong</h2>
        <p style={{ fontSize: '13px', color: 'var(--muted2)', marginBottom: '24px' }}>{error}</p>
        <button onClick={() => navigate('/')} className="btn btn-primary">← Back to Login</button>
      </div>
    );
  }

  return (
    <>
      <nav className="nav">
        <div className="nav-logo" onClick={() => window.location.reload()}>BeatWrap 🎵</div>
        <div className="nav-spacer" />
        <div className="nav-user">
          <img className="nav-avatar" src={storage.get('profile_image')} alt="" />
          <span>{storage.get('display_name')}</span>
        </div>
        <button className="btn btn-sm" onClick={handleRefresh} disabled={refreshing || refreshesLeft === 0}>
          {refreshing ? 'Refreshing...' : `Refresh (${refreshesLeft})`}
        </button>
        <button className="btn btn-sm" onClick={handleExport}>Export</button>
        <button className="btn btn-sm" onClick={logout}>Logout</button>
      </nav>

      <main style={{ maxWidth: '680px', margin: '0 auto', padding: '28px 20px 80px' }}>
        <WeekCard data={data} />
        <TopNowCard type="track" item={data.topTrackNow} />
        <TopNowCard type="artist" item={data.topArtistNow} />
        <MoodCard
          selectedMood={selectedMood}
          setSelectedMood={setSelectedMood}
          moodNote={moodNote}
          setMoodNote={setMoodNote}
          onSave={handleSaveMood}
          moodSaved={moodSaved}
        />
        <Section label="Weekly Top Tracks">
          {data.topTracks.map((t, i) => <TrackRow key={i} track={t} rank={i + 1} />)}
        </Section>
        <Section label="Weekly Top Artists">
          {data.topArtists.map((a, i) => <ArtistRow key={i} artist={a} rank={i + 1} />)}
        </Section>
        <Section label="Genre Mix">
          <div className="card"><GenreList genres={data.topGenres} /></div>
        </Section>
        <Section label="Listening By Day">
          <div className="card"><DayGrid breakdown={data.dayBreakdown} /></div>
        </Section>
      </main>

      <div className={`toast ${toast.green ? 'green' : ''} ${toast.show ? 'show' : ''}`}>
        {toast.message}
      </div>
    </>
  );
}

function WeekCard({ data }) {
  return (
    <div style={{
      background: 'var(--s1)', border: '1px solid var(--border)', borderRadius: '16px',
      padding: '24px', marginBottom: '28px', display: 'flex', alignItems: 'center',
      justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px'
    }}>
      <div>
        <div style={{ fontSize: '22px', fontWeight: 800, letterSpacing: '-0.5px' }}>This Week's Wrapped</div>
        <div style={{ fontSize: '12px', color: 'var(--muted2)', marginTop: '3px' }}>{data.weekRange}</div>
      </div>
      <div style={{ display: 'flex', gap: '24px' }}>
        <Stat value={data.stats.totalTracks} label="tracks" />
        <Stat value={data.stats.uniqueArtists} label="artists" />
        <Stat value={data.stats.totalMinutes || '—'} label="minutes" />
      </div>
    </div>
  );
}

function Stat({ value, label }) {
  return (
    <div>
      <div style={{ fontSize: '26px', fontWeight: 800, color: 'var(--green)', letterSpacing: '-1px' }}>{value}</div>
      <div style={{ fontSize: '11px', color: 'var(--muted2)', marginTop: '3px' }}>{label}</div>
    </div>
  );
}

function TopNowCard({ type, item }) {
  if (!item) return null;
  const isArtist = type === 'artist';
  return (
    <div style={{ marginBottom: '28px' }}>
      <div className="section-label">Top {isArtist ? 'Artist' : 'Track'} Right Now</div>
      <div style={{
        background: 'linear-gradient(135deg, rgba(29,185,84,0.08) 0%, rgba(29,185,84,0.02) 100%)',
        border: '1px solid rgba(29,185,84,0.15)', borderRadius: '16px',
        padding: '20px', display: 'flex', alignItems: 'center', gap: '16px'
      }}>
        <img
          style={{
            width: '80px', height: '80px', borderRadius: isArtist ? '50%' : '12px',
            objectFit: 'cover', background: 'var(--s3)', flexShrink: 0,
            boxShadow: '0 4px 16px rgba(0,0,0,0.3)'
          }}
          src={isArtist ? item.images?.[1]?.url : item.album?.images?.[1]?.url}
          alt=""
          onError={(e) => e.target.style.background = 'var(--s3)'}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: '10px', fontWeight: 700, letterSpacing: '2px',
            textTransform: 'uppercase', color: 'var(--green)', marginBottom: '4px'
          }}>
            #1 {isArtist ? 'Artist' : 'Track'} This Month
          </div>
          <div style={{
            fontSize: '20px', fontWeight: 800, letterSpacing: '-0.5px',
            marginBottom: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
          }}>
            {item.name}
          </div>
          <div style={{ fontSize: '13px', color: 'var(--muted2)' }}>
            {isArtist ? (item.genres || []).slice(0, 3).join(' · ') || 'No genres' : item.artists?.map(a => a.name).join(', ')}
          </div>
        </div>
      </div>
    </div>
  );
}

function MoodCard({ selectedMood, setSelectedMood, moodNote, setMoodNote, onSave, moodSaved }) {
  const emojis = [
    { emoji: '😔', label: 'Low', score: 1 },
    { emoji: '😐', label: 'Meh', score: 2 },
    { emoji: '🙂', label: 'Okay', score: 3 },
    { emoji: '😄', label: 'Good', score: 4 },
    { emoji: '🔥', label: 'Great', score: 5 },
    { emoji: '😤', label: 'Stressed', score: 6 },
  ];

  return (
    <div style={{ marginBottom: '28px' }}>
      <div className="section-label">Vibe Check</div>
      <div style={{ background: 'var(--s1)', border: '1px solid var(--border)', borderRadius: '16px', padding: '22px' }}>
        <div style={{ fontSize: '16px', fontWeight: 700, marginBottom: '4px' }}>How's your week been?</div>
        <div style={{ fontSize: '13px', color: 'var(--muted2)', marginBottom: '18px', lineHeight: 1.5 }}>
          Tap once and you're done. Helps train future AI features.
        </div>
        <div className="emoji-grid">
          {emojis.map(({ emoji, label, score }) => (
            <button
              key={score}
              className={`emoji-btn ${selectedMood.emoji === emoji ? 'selected' : ''}`}
              onClick={() => setSelectedMood({ emoji, score })}
            >
              <span className="emoji-char">{emoji}</span>
              <span className="emoji-label">{label}</span>
            </button>
          ))}
        </div>
        <textarea
          style={{
            width: '100%', background: 'var(--s2)', border: '1px solid var(--border)',
            borderRadius: '10px', padding: '11px 14px', color: 'var(--text)',
            fontFamily: 'Syne, sans-serif', fontSize: '13px', resize: 'none',
            outline: 'none', marginBottom: '12px'
          }}
          rows={2}
          placeholder="Anything on your mind this week? (optional, max 280 chars)"
          value={moodNote}
          onChange={(e) => setMoodNote(e.target.value)}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button className="btn btn-green-sm" onClick={onSave}>Save Vibe</button>
          <span style={{
            fontSize: '12px', color: 'var(--green)',
            opacity: moodSaved ? 1 : 0, transition: 'opacity 0.3s'
          }}>
            ✓ Saved locally
          </span>
        </div>
      </div>
    </div>
  );
}

function Section({ label, children }) {
  return (
    <div style={{ marginBottom: '28px' }}>
      <div className="section-label">{label}</div>
      <div className="gap-8">{children}</div>
    </div>
  );
}

function TrackRow({ track, rank }) {
  return (
    <div className="list-item">
      <div className="list-rank">{rank}</div>
      <img className="list-img" src={track.album?.images?.[2]?.url} alt="" onError={(e) => e.target.style.background = 'var(--s3)'} />
      <div className="list-info">
        <div className="list-name">{track.name}</div>
        <div className="list-sub">{track.artists?.map(a => a.name).join(', ')}</div>
      </div>
      <div className="list-meta">{msToMin(track.duration_ms)}</div>
    </div>
  );
}

function ArtistRow({ artist, rank }) {
  return (
    <div className="list-item">
      <div className="list-rank">{rank}</div>
      <img className="list-img circle" src={artist.images?.[2]?.url} alt="" onError={(e) => e.target.style.background = 'var(--s3)'} />
      <div className="list-info">
        <div className="list-name">{artist.name}</div>
        <div className="list-sub">{(artist.genres || []).slice(0, 3).join(' · ') || 'No genres'}</div>
      </div>
    </div>
  );
}

function GenreList({ genres }) {
  React.useEffect(() => {
    requestAnimationFrame(() => requestAnimationFrame(() => {
      document.querySelectorAll('.genre-fill').forEach(el => {
        el.style.width = el.dataset.w + '%';
      });
    }));
  }, [genres]);

  if (!genres.length) return <div className="empty"><span>🎸</span>No genres yet.</div>;
  
  return genres.map((g, i) => (
    <div key={i} className="genre-row">
      <div className="genre-header">
        <div className="genre-name">{g.genre}</div>
        <div className="genre-count">{g.count} artist{g.count > 1 ? 's' : ''}</div>
      </div>
      <div className="genre-track">
        <div className="genre-fill" data-w={g.percentage} />
      </div>
    </div>
  ));
}

function DayGrid({ breakdown }) {
  const order = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const today = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date().getDay()];
  const max = Math.max(...Object.values(breakdown), 1);

  return (
    <div className="day-grid">
      {order.map(d => {
        const count = breakdown[d] || 0;
        const height = Math.max(3, Math.round((count / max) * 70));
        return (
          <div key={d} className="day-col">
            <div className="day-bar-wrap">
              <div className={`day-bar ${d === today ? 'today' : ''}`} style={{ height: `${height}px` }} />
            </div>
            <div className="day-label">{d}</div>
            <div className="day-count">{count}</div>
          </div>
        );
      })}
    </div>
  );
}

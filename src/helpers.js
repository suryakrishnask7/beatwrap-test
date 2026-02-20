export const getWeekRange = () => {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const start = new Date(now);
  start.setDate(now.getDate() + diff);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  const weekNum = getISOWeek(start);
  return {
    start,
    end,
    weekId: `${start.getFullYear()}-W${String(weekNum).padStart(2, '0')}`
  };
};

const getISOWeek = (d) => {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
};

export const formatDate = (d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

export const msToMin = (ms) => {
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${m}:${String(s).padStart(2, '0')}`;
};

export const saveWrappedData = (weekId, data) => localStorage.setItem(`bw_wrap_${weekId}`, JSON.stringify(data));

export const saveMoodLog = (date, data) => localStorage.setItem(`bw_mood_${date}`, JSON.stringify(data));

export const getMoodLog = (date) => {
  const json = localStorage.getItem(`bw_mood_${date}`);
  return json ? JSON.parse(json) : null;
};

export const exportAllData = () => {
  const exported = { exportedAt: new Date().toISOString(), wraps: [], moods: [] };
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key.startsWith('bw_wrap_')) exported.wraps.push(JSON.parse(localStorage.getItem(key)));
    if (key.startsWith('bw_mood_')) exported.moods.push(JSON.parse(localStorage.getItem(key)));
  }
  return exported;
};

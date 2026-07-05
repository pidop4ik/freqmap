const LS_KEY = (pilotId) => `freqmap_avatar_${pilotId}`;
const API_BASE = import.meta.env.VITE_API_BASE ?? '/api';

/** Read the stored avatar — сначала localStorage (кэш), потом бэкенд. */
export function getAvatar(pilotId) {
  if (pilotId == null) return null;
  try { return localStorage.getItem(LS_KEY(pilotId)) || null; }
  catch { return null; }
}

/**
 * Загружает аватар с бэкенда и кэширует в localStorage.
 * Возвращает data-URL или null.
 */
export async function fetchAvatar(pilotId) {
  if (pilotId == null) return null;
  const cached = getAvatar(pilotId);
  if (cached) return cached;
  try {
    const r = await fetch(`${API_BASE}/pilots/${pilotId}/profile`);
    if (!r.ok) return null;
    const data = await r.json();
    if (data.avatar_url) {
      try { localStorage.setItem(LS_KEY(pilotId), data.avatar_url); } catch {}
      return data.avatar_url;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Persist аватар — сохраняет в localStorage И отправляет на бэкенд.
 */
export async function setAvatar(pilotId, dataUrl) {
  if (pilotId == null) return;
  try { localStorage.setItem(LS_KEY(pilotId), dataUrl); } catch {}
  try {
    await fetch(`${API_BASE}/pilots/${pilotId}/profile`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ avatar_url: dataUrl }),
    });
  } catch {}
}

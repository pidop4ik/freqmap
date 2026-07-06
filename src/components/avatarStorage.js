const LS_KEY = (pilotId) => `freqmap_avatar_${pilotId}`;
const API = '/api';

/** Read the locally cached avatar Data-URL for a given pilot (instant, may be stale). */
export function getAvatar(pilotId) {
  if (pilotId == null) return null;
  try { return localStorage.getItem(LS_KEY(pilotId)) || null; }
  catch { return null; }
}

/** Fetch the real avatar from the server (works for any pilot, including other users). */
export async function fetchAvatar(pilotId) {
  if (pilotId == null) return null;
  try {
    const r = await fetch(`${API}/pilots/${pilotId}/avatar`);
    if (!r.ok) return null;
    const data = await r.json();
    if (data.avatar) {
      try { localStorage.setItem(LS_KEY(pilotId), data.avatar); } catch { /* quota */ }
    }
    return data.avatar || null;
  } catch { return null; }
}

/** Persist a compressed Data-URL avatar for a given pilot: locally (instant) + synced to server. */
export function setAvatar(pilotId, dataUrl) {
  if (pilotId == null) return;
  try { localStorage.setItem(LS_KEY(pilotId), dataUrl); } catch { /* quota exceeded */ }
  fetch(`${API}/pilots/${pilotId}/avatar`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ avatar: dataUrl }),
  }).catch(() => { /* offline, will retry on next set */ });
}

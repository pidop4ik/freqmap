const LS_KEY = (pilotId) => `freqmap_avatar_${pilotId}`;

/** Read the stored avatar Data-URL for a given pilot (or null). */
export function getAvatar(pilotId) {
  if (pilotId == null) return null;
  try { return localStorage.getItem(LS_KEY(pilotId)) || null; }
  catch { return null; }
}

/** Persist a compressed Data-URL avatar for a given pilot. */
export function setAvatar(pilotId, dataUrl) {
  if (pilotId == null) return;
  try { localStorage.setItem(LS_KEY(pilotId), dataUrl); }
  catch { /* quota exceeded */ }
}

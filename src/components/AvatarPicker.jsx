import React, { useRef, useState } from 'react';
import { Camera, User } from 'lucide-react';

const LS_KEY = (pilotId) => `freqmap_avatar_${pilotId}`;

/** Read the stored avatar Data-URL for a given pilot (or null). */
export function getAvatar(pilotId) {
  if (pilotId == null) return null;
  try { return localStorage.getItem(LS_KEY(pilotId)) || null; }
  catch { return null; }
}

/**
 * AvatarPicker — editable avatar for the owner.
 *
 * Props:
 *   pilotId   number
 *   size      number  (px, default 80)
 *   editable  boolean (default true)
 */
export default function AvatarPicker({ pilotId, size = 80, editable = true }) {
  const [src, setSrc] = useState(() => getAvatar(pilotId));
  const [hover, setHover] = useState(false);
  const inputRef = useRef(null);

  function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target.result;

      // Downscale to 256×256 to keep localStorage usage low
      const img = new Image();
      img.onload = () => {
        const MAX = 256;
        const scale = Math.min(1, MAX / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);

        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');

        // Clip to circle
        ctx.beginPath();
        ctx.arc(w / 2, h / 2, Math.min(w, h) / 2, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(img, 0, 0, w, h);

        const compressed = canvas.toDataURL('image/jpeg', 0.82);
        try { localStorage.setItem(LS_KEY(pilotId), compressed); } catch { /* quota */ }
        setSrc(compressed);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
    // reset so same file can be re-selected
    e.target.value = '';
  }

  const btnSize = Math.round(size * 0.35);
  const iconSize = Math.round(btnSize * 0.55);

  return (
    <div
      className="avatar-picker"
      style={{ width: size, height: size }}
      onMouseEnter={() => editable && setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {/* Avatar image or placeholder */}
      {src ? (
        <img
          src={src}
          alt="Avatar"
          className="avatar-picker__img"
          style={{ width: size, height: size }}
          draggable={false}
        />
      ) : (
        <div className="avatar-picker__placeholder" style={{ width: size, height: size }}>
          <User size={Math.round(size * 0.45)} strokeWidth={1.5} />
        </div>
      )}

      {/* Edit overlay */}
      {editable && (
        <>
          <div
            className={`avatar-picker__overlay${hover ? ' avatar-picker__overlay--visible' : ''}`}
            onClick={() => inputRef.current?.click()}
            role="button"
            aria-label="Change avatar"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
          >
            <Camera size={iconSize} />
          </div>

          <button
            className="avatar-picker__btn"
            style={{ width: btnSize, height: btnSize }}
            onClick={() => inputRef.current?.click()}
            aria-label="Upload avatar"
            type="button"
          >
            <Camera size={iconSize} />
          </button>

          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleFile}
          />
        </>
      )}
    </div>
  );
}

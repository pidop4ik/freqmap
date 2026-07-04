import React, { useState } from 'react';
import { MapPin, Check } from 'lucide-react';

const TAG_OPTIONS = ['park', 'field', 'forest', 'urban', 'water', 'hills', 'training', 'race'];

export default function ProposeSpotSheet({ pilotId, coords, onClose, t, demoMode, lsSpots, lsSetSpots, apiBase }) {
  const [name, setName]         = useState('');
  const [desc, setDesc]         = useState('');
  const [tags, setTags]         = useState([]);
  const [step, setStep]         = useState(1); // 1=form, 2=success
  const [error, setError]       = useState('');

  const toggleTag = (tag) => setTags((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]);

  const handleSubmit = async () => {
    if (!name.trim()) { setError('Spot name is required'); return; }
    if (demoMode) {
      // demo: save to localStorage as pending
      const spot = {
        id: `demo-${Date.now()}`,
        pilot_id: pilotId,
        pilot_username: 'me',
        name: name.trim(),
        description: desc.trim(),
        lat: coords?.lat ?? 50.0,
        lng: coords?.lng ?? 20.0,
        tags,
        status: 'pending',
        created_at: new Date().toISOString(),
      };
      if (lsSetSpots) lsSetSpots([...lsSpots, spot]);
      setStep(2);
      return;
    }
    try {
      const res = await fetch(`${apiBase}/spots`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pilot_id: pilotId,
          name: name.trim(),
          description: desc.trim(),
          lat: coords?.lat ?? 50.0,
          lng: coords?.lng ?? 20.0,
          tags,
        }),
      });
      if (!res.ok) { 
        const d = await res.json().catch(() => ({}));
        setError(d.detail || `Error ${res.status}`); 
        return; 
      }
      setStep(2);
    } catch (e) { 
      console.log('[v0] spot submit error:', e);
      setError(e.message === 'Failed to fetch' ? 'Backend unavailable' : e.message); 
    }
  };

  return (
    <div className="fullscreen-tab" role="dialog" aria-modal="true">
      {/* Header */}
      <div className="tab-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <MapPin size={18} color="var(--accent)" />
          <h2 className="tab-title" style={{ margin: 0 }}>{t.propose_spot ?? 'Propose a Spot'}</h2>
        </div>
      </div>

      <div className="tab-body">
        {step === 2 ? (
          <div className="propose-success">
            <div className="propose-success__icon"><Check size={32} color="var(--accent)" /></div>
            <p className="propose-success__title">{t.spot_submitted ?? 'Spot submitted!'}</p>
            <p className="propose-success__sub">Admins will review your spot soon.</p>
            <button className="btn-primary" onClick={onClose}>OK</button>
          </div>
        ) : (
          <div className="propose-form">
            {coords && (
              <p className="modal-coords">
                {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
              </p>
            )}

            {error && <p className="auth-error">{error}</p>}

            <div className="form-field">
              <label className="field-label">{t.spot_name ?? 'Spot name'}</label>
              <input
                className="field-input"
                placeholder="e.g. Riverside Park"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={80}
              />
            </div>
            <div className="form-field">
              <label className="field-label">{t.spot_desc ?? 'Description'}</label>
              <textarea
                className="field-input field-textarea"
                placeholder="Any useful info about this spot..."
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                rows={3}
                maxLength={500}
              />
            </div>

            <div className="form-field">
              <label className="field-label">Tags</label>
              <div className="tag-grid">
                {TAG_OPTIONS.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    className={`tag tag--btn${tags.includes(tag) ? ' tag--btn-active' : ''}`}
                    onClick={() => toggleTag(tag)}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-actions">
              <button className="btn-secondary" onClick={onClose}>{t.cancel ?? 'Cancel'}</button>
              <button className="btn-primary" onClick={handleSubmit}>{t.propose_spot ?? 'Submit'}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

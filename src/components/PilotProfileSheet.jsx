import React, { useState } from 'react';
import { X, Radio, Zap, Maximize2, Weight, ChevronDown, ChevronUp, Trash2, Pencil, Check, AlertTriangle } from 'lucide-react';
import FrequencySelector from './FrequencySelector.jsx';

/**
 * PilotProfileSheet
 *
 * Панель-слайд, открывается при нажатии на метку пилота.
 * Показывает ник, Pilot ID, список дронов.
 * Если isOwner=true — можно редактировать/удалять дроны.
 *
 * Props:
 *   pilot      { id, username }
 *   drones     DroneProfile[]
 *   isOwner    boolean
 *   conflictIds Set<number>
 *   onClose    () => void
 *   onDeleteDrone  (droneId) => void        — только для владельца
 *   onUpdateDrone  (droneId, patch) => void — только для владельца
 */
export default function PilotProfileSheet({
  pilot,
  drones = [],
  isOwner = false,
  conflictIds = new Set(),
  onClose,
  onDeleteDrone,
  onUpdateDrone,
}) {
  const [expandedId, setExpandedId] = useState(null);
  const [editingId, setEditingId]   = useState(null);
  const [editForm, setEditForm]     = useState({});

  const toggleExpand = (id) => {
    setExpandedId((prev) => (prev === id ? null : id));
    if (editingId !== id) setEditingId(null);
  };

  const startEdit = (drone) => {
    setEditForm({
      name:          drone.name,
      videoType:     drone.videoType || 'analog',
      band:          drone.band      || 'R',
      channel:       drone.channel   || 1,
      frequency_mhz: drone.frequency_mhz || 5658,
      video_system:  drone.video_system || '',
      power_mw:      drone.power_mw  || 200,
      drone_size:    drone.drone_size || '5 inch',
      weight_g:      drone.weight_g  || '',
      // spec fields
      motor:         drone.motor     || '',
      props:         drone.props     || '',
      battery:       drone.battery   || '',
      vtx:           drone.vtx       || '',
      camera:        drone.camera    || '',
      fc:            drone.fc        || '',
      esc:           drone.esc       || '',
      rx:            drone.rx        || '',
      notes:         drone.notes     || '',
    });
    setEditingId(drone.id);
    setExpandedId(drone.id);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const saveEdit = (droneId) => {
    if (onUpdateDrone) {
      onUpdateDrone(droneId, {
        name:          editForm.name,
        videoType:     editForm.videoType,
        band:          editForm.band,
        channel:       editForm.channel,
        frequency_mhz: editForm.frequency_mhz,
        video_system:  editForm.videoType === 'analog'
                         ? `Analog / ${editForm.band}`
                         : editForm.video_system,
        power_mw:      parseInt(editForm.power_mw, 10) || 200,
        drone_size:    editForm.drone_size,
        weight_g:      editForm.weight_g ? parseInt(editForm.weight_g, 10) : null,
        motor:         editForm.motor,
        props:         editForm.props,
        battery:       editForm.battery,
        vtx:           editForm.vtx,
        camera:        editForm.camera,
        fc:            editForm.fc,
        esc:           editForm.esc,
        rx:            editForm.rx,
        notes:         editForm.notes,
      });
    }
    setEditingId(null);
    setEditForm({});
  };

  return (
    <div className="profile-sheet" role="dialog" aria-modal="true" aria-label={`Pilot ${pilot?.username}`}>
      {/* Backdrop */}
      <div className="profile-sheet__backdrop" onClick={onClose} />

      <div className="profile-sheet__panel">
        {/* Header */}
        <div className="profile-sheet__header">
          <div className="profile-sheet__pilot-info">
            <div className="profile-sheet__avatar">
              {pilot?.username?.[0]?.toUpperCase() ?? '?'}
            </div>
            <div>
              <h2 className="profile-sheet__username">{pilot?.username}</h2>
              <p className="profile-sheet__id">Pilot #{pilot?.id}</p>
            </div>
          </div>
          <button
            className="btn-icon"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Drone list */}
        <div className="profile-sheet__body">
          <h3 className="profile-sheet__section-title">
            Hangar
            <span className="profile-sheet__drone-count">{drones.length}</span>
          </h3>

          {drones.length === 0 && (
            <p className="empty-text">No drones registered.</p>
          )}

          {drones.map((drone) => {
            const isConflict = conflictIds.has(drone.id);
            const isExpanded = expandedId === drone.id;
            const isEditing  = editingId  === drone.id;

            return (
              <div
                key={drone.id}
                className={`profile-drone-card ${isConflict ? 'profile-drone-card--conflict' : ''}`}
              >
                {/* Card header row */}
                <div className="profile-drone-card__top">
                  <button
                    className="profile-drone-card__toggle"
                    onClick={() => toggleExpand(drone.id)}
                    aria-expanded={isExpanded}
                  >
                    <span className="profile-drone-card__name">
                      {isEditing
                        ? <input
                            className="field-input field-input--inline"
                            value={editForm.name}
                            onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                            onClick={(e) => e.stopPropagation()}
                          />
                        : drone.name
                      }
                    </span>
                    <span className="profile-drone-card__meta">
                      {isConflict && (
                        <span className="conflict-badge conflict-badge--sm">
                          <AlertTriangle size={10} /> CONFLICT
                        </span>
                      )}
                      <span className="profile-drone-card__freq">
                        {drone.frequency_mhz ? `${drone.frequency_mhz} MHz` : '—'}
                      </span>
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </span>
                  </button>

                  {/* Owner actions */}
                  {isOwner && !isEditing && (
                    <div className="profile-drone-card__actions">
                      <button
                        className="btn-icon btn-icon--sm"
                        onClick={() => startEdit(drone)}
                        aria-label="Edit drone"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        className="btn-icon btn-icon--sm btn-icon--danger"
                        onClick={() => onDeleteDrone && onDeleteDrone(drone.id)}
                        aria-label="Delete drone"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}

                  {isOwner && isEditing && (
                    <div className="profile-drone-card__actions">
                      <button
                        className="btn-icon btn-icon--sm btn-icon--success"
                        onClick={() => saveEdit(drone.id)}
                        aria-label="Save"
                      >
                        <Check size={14} />
                      </button>
                      <button
                        className="btn-icon btn-icon--sm"
                        onClick={cancelEdit}
                        aria-label="Cancel"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Quick info chips — always visible */}
                {!isEditing && (
                  <div className="profile-drone-card__chips">
                    <span className="info-chip"><Radio size={11} />{drone.video_system || '—'}</span>
                    {drone.band && (
                      <span className="info-chip">{drone.band} / CH{drone.channel}</span>
                    )}
                    {drone.drone_size && (
                      <span className="info-chip"><Maximize2 size={11} />{drone.drone_size}</span>
                    )}
                    {drone.power_mw && (
                      <span className="info-chip"><Zap size={11} />{drone.power_mw} mW</span>
                    )}
                    {drone.weight_g && (
                      <span className="info-chip"><Weight size={11} />{drone.weight_g} g</span>
                    )}
                  </div>
                )}

                {/* Expanded: edit form or full specs */}
                {isExpanded && (
                  <div className="profile-drone-card__expanded">
                    {isEditing ? (
                      <EditDroneForm
                        form={editForm}
                        setForm={setEditForm}
                      />
                    ) : (
                      <SpecsView drone={drone} />
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// EditDroneForm — форма редактирования внутри карточки
// ---------------------------------------------------------------------------
function EditDroneForm({ form, setForm }) {
  const SIZES = ['Micro (< 3")', '3 inch', '3.5 inch', '4 inch', '5 inch', '6 inch', '7 inch', '10 inch', 'Fixed Wing'];

  return (
    <div className="edit-form">
      {/* Freq */}
      <FrequencySelector
        value={{
          videoType:     form.videoType,
          band:          form.band,
          channel:       form.channel,
          frequency_mhz: form.frequency_mhz,
        }}
        onChange={(v) =>
          setForm((p) => ({
            ...p,
            videoType:     v.videoType,
            band:          v.band,
            channel:       v.channel,
            frequency_mhz: v.frequency_mhz,
            video_system:  v.videoType === 'analog' ? `Analog / ${v.band}` : p.video_system,
          }))
        }
      />

      <div className="form-row">
        <div className="form-field">
          <label className="field-label">Power (mW)</label>
          <input
            type="number"
            className="field-input"
            value={form.power_mw}
            onChange={(e) => setForm((p) => ({ ...p, power_mw: e.target.value }))}
            min={25} max={2000}
          />
        </div>
        <div className="form-field">
          <label className="field-label">Size</label>
          <select
            className="field-input"
            value={form.drone_size}
            onChange={(e) => setForm((p) => ({ ...p, drone_size: e.target.value }))}
          >
            {SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <div className="form-row">
        <div className="form-field">
          <label className="field-label">Weight (g)</label>
          <input
            type="number"
            className="field-input"
            placeholder="250"
            value={form.weight_g}
            onChange={(e) => setForm((p) => ({ ...p, weight_g: e.target.value }))}
            min={1}
          />
        </div>
      </div>

      {/* Specs section */}
      <div className="edit-form__section-label">Specs (optional)</div>
      <div className="form-row">
        <SpecInput label="FC"     field="fc"     form={form} setForm={setForm} />
        <SpecInput label="ESC"    field="esc"    form={form} setForm={setForm} />
      </div>
      <div className="form-row">
        <SpecInput label="Motor"  field="motor"  form={form} setForm={setForm} />
        <SpecInput label="Props"  field="props"  form={form} setForm={setForm} />
      </div>
      <div className="form-row">
        <SpecInput label="Camera" field="camera" form={form} setForm={setForm} />
        <SpecInput label="VTX"    field="vtx"    form={form} setForm={setForm} />
      </div>
      <div className="form-row">
        <SpecInput label="RX"     field="rx"     form={form} setForm={setForm} />
      </div>
      <div className="form-field">
        <label className="field-label">Battery</label>
        <input
          type="text"
          className="field-input"
          placeholder="4S 1500mAh"
          value={form.battery}
          onChange={(e) => setForm((p) => ({ ...p, battery: e.target.value }))}
        />
      </div>
      <div className="form-field">
        <label className="field-label">Notes</label>
        <textarea
          className="field-input field-textarea"
          placeholder="Any extra info..."
          value={form.notes}
          onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
          rows={3}
        />
      </div>
    </div>
  );
}

function SpecInput({ label, field, form, setForm }) {
  return (
    <div className="form-field">
      <label className="field-label">{label}</label>
      <input
        type="text"
        className="field-input"
        value={form[field]}
        onChange={(e) => setForm((p) => ({ ...p, [field]: e.target.value }))}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// SpecsView — только просмотр характеристик
// ---------------------------------------------------------------------------
function SpecsView({ drone }) {
  const specs = [
    { label: 'FC',      value: drone.fc },
    { label: 'ESC',     value: drone.esc },
    { label: 'Motor',   value: drone.motor },
    { label: 'Props',   value: drone.props },
    { label: 'Camera',  value: drone.camera },
    { label: 'VTX',     value: drone.vtx },
    { label: 'RX',      value: drone.rx },
    { label: 'Battery', value: drone.battery },
  ].filter((s) => s.value);

  if (specs.length === 0 && !drone.notes) {
    return <p className="empty-text" style={{ fontSize: '12px', marginTop: '8px' }}>No specs added yet.</p>;
  }

  return (
    <div className="specs-view">
      {specs.length > 0 && (
        <div className="specs-grid">
          {specs.map(({ label, value }) => (
            <div key={label} className="specs-row">
              <span className="specs-label">{label}</span>
              <span className="specs-value">{value}</span>
            </div>
          ))}
        </div>
      )}
      {drone.notes && (
        <p className="specs-notes">{drone.notes}</p>
      )}
    </div>
  );
}

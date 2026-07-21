import React, { useState } from 'react';
import {
  X, Radio, Zap, Maximize2, Weight, ChevronDown, ChevronUp,
  Trash2, Pencil, Check, AlertTriangle, Info, Cpu, Save,
} from 'lucide-react';
import FrequencySelector from './FrequencySelector.jsx';
import AvatarPicker from './AvatarPicker.jsx';

// ---------------------------------------------------------------------------
// Per-language strings used inside this component
// ---------------------------------------------------------------------------
const SHEET_I18N = {
  ru: {
    hangar: 'Ангар',
    pilot: 'Пилот',
    no_drones: 'Дронов нет.',
    no_specs: 'Характеристики не заполнены.',
    tab_info: 'Основное',
    tab_specs: 'Спеки',
    tab_edit: 'Редактировать',
    delete_confirm: 'Удалить этот дрон?',
    delete: 'Удалить',
    cancel: 'Отмена',
    save: 'Сохранить',
    edit: 'Редактировать',
    conflict: 'КОНФЛИКТ',
    // field labels
    name: 'Название',
    power: 'Мощность (mW)',
    size: 'Размер',
    weight: 'Вес (г)',
    fc: 'FC',
    esc: 'ESC',
    motor: 'Мотор',
    props: 'Пропы',
    camera: 'Камера',
    vtx: 'VTX',
    rx: 'RX',
    battery: 'Аккумулятор',
    notes: 'Заметки',
    freq_section: 'Частота',
    basic_section: 'Основные',
    specs_section: 'Характеристики (по желанию)',
    notes_placeholder: 'Любая дополнительная информация...',
  },
  en: {
    hangar: 'Hangar',
    pilot: 'Pilot',
    no_drones: 'No drones registered.',
    no_specs: 'No specs added yet.',
    tab_info: 'Info',
    tab_specs: 'Specs',
    tab_edit: 'Edit',
    delete_confirm: 'Delete this drone?',
    delete: 'Delete',
    cancel: 'Cancel',
    save: 'Save',
    edit: 'Edit',
    conflict: 'CONFLICT',
    name: 'Name',
    power: 'Power (mW)',
    size: 'Size',
    weight: 'Weight (g)',
    fc: 'FC',
    esc: 'ESC',
    motor: 'Motor',
    props: 'Props',
    camera: 'Camera',
    vtx: 'VTX',
    rx: 'RX',
    battery: 'Battery',
    notes: 'Notes',
    freq_section: 'Frequency',
    basic_section: 'Basic info',
    specs_section: 'Specs (optional)',
    notes_placeholder: 'Any extra info...',
  },
  pl: {
    hangar: 'Hangar',
    pilot: 'Pilot',
    no_drones: 'Brak zarejestrowanych dronów.',
    no_specs: 'Brak specyfikacji.',
    tab_info: 'Info',
    tab_specs: 'Specyfikacja',
    tab_edit: 'Edytuj',
    delete_confirm: 'Usunąć tego drona?',
    delete: 'Usuń',
    cancel: 'Anuluj',
    save: 'Zapisz',
    edit: 'Edytuj',
    conflict: 'KONFLIKT',
    name: 'Nazwa',
    power: 'Moc (mW)',
    size: 'Rozmiar',
    weight: 'Waga (g)',
    fc: 'FC',
    esc: 'ESC',
    motor: 'Silnik',
    props: 'Śmigła',
    camera: 'Kamera',
    vtx: 'VTX',
    rx: 'Odbiornik',
    battery: 'Akumulator',
    notes: 'Notatki',
    freq_section: 'Częstotliwość',
    basic_section: 'Podstawowe',
    specs_section: 'Specyfikacja (opcjonalnie)',
    notes_placeholder: 'Dodatkowe informacje...',
  },
};

const SIZES = [
  'Micro (< 3")', '3 inch', '3.5 inch', '4 inch',
  '5 inch', '6 inch', '7 inch', '10 inch', 'Fixed Wing',
];

/**
 * PilotProfileSheet
 *
 * Props:
 *   pilot         { id, username }
 *   drones        DroneProfile[]
 *   isOwner       boolean
 *   conflictIds   Set<number>
 *   lang          'ru' | 'en' | 'pl'
 *   onClose       () => void
 *   onDeleteDrone (droneId) => void
 *   onUpdateDrone (droneId, patch) => void
 */
export default function PilotProfileSheet({
  pilot,
  drones = [],
  isOwner = false,
  conflictIds = new Set(),
  lang = 'en',
  onClose,
  onDeleteDrone,
  onUpdateDrone,
}) {
  const s = SHEET_I18N[lang] ?? SHEET_I18N.en;

  // Which drone card is open + which tab is active inside it
  const [expandedId, setExpandedId] = useState(null);
  const [activeTab, setActiveTab]   = useState({}); // { [droneId]: 'info'|'specs'|'edit' }

  // Confirm-delete state
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  // Edit form state — keyed by droneId so switching cards doesn't mix data
  const [editForms, setEditForms] = useState({});

  // -------------------------------------------------------------------------
  const openCard = (drone) => {
    if (expandedId === drone.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(drone.id);
    // Default tab
    if (!activeTab[drone.id]) {
      setActiveTab((p) => ({ ...p, [drone.id]: 'info' }));
    }
  };

  const switchTab = (droneId, tab) => {
    setActiveTab((p) => ({ ...p, [droneId]: tab }));
    if (tab === 'edit') {
      // Seed the edit form if not yet seeded
      setEditForms((prev) => {
        if (prev[droneId]) return prev;
        const drone = drones.find((d) => d.id === droneId);
        if (!drone) return prev;
        return {
          ...prev,
          [droneId]: {
            name:          drone.name          || '',
            videoType:     drone.videoType      || 'analog',
            band:          drone.band           || 'R',
            channel:       drone.channel        || 1,
            frequency_mhz: drone.frequency_mhz  || 5658,
            video_system:  drone.video_system   || '',
            power_mw:      drone.power_mw       || 200,
            drone_size:    drone.drone_size      || '5 inch',
            weight_g:      drone.weight_g        || '',
            motor:         drone.motor           || '',
            props:         drone.props           || '',
            battery:       drone.battery         || '',
            vtx:           drone.vtx             || '',
            camera:        drone.camera          || '',
            fc:            drone.fc              || '',
            esc:           drone.esc             || '',
            rx:            drone.rx              || '',
            notes:         drone.notes           || '',
          },
        };
      });
    }
  };

  const patchForm = (droneId, patch) => {
    setEditForms((prev) => ({
      ...prev,
      [droneId]: { ...prev[droneId], ...patch },
    }));
  };

  const saveEdit = (droneId) => {
    const form = editForms[droneId];
    if (!form || !onUpdateDrone) return;
    onUpdateDrone(droneId, {
      name:          form.name,
      videoType:     form.videoType,
      band:          form.band,
      channel:       form.channel,
      frequency_mhz: form.frequency_mhz,
      video_system:  form.videoType === 'analog'
                       ? `Analog / ${form.band}`
                       : form.video_system,
      power_mw:      parseInt(form.power_mw,  10) || 200,
      drone_size:    form.drone_size,
      weight_g:      form.weight_g ? parseInt(form.weight_g, 10) : null,
      motor:   form.motor,   props:   form.props,
      battery: form.battery, vtx:     form.vtx,
      camera:  form.camera,  fc:      form.fc,
      esc:     form.esc,     rx:      form.rx,
      notes:   form.notes,
    });
    // Switch back to info tab after save
    setActiveTab((p) => ({ ...p, [droneId]: 'info' }));
    // Clear seeded form so next edit re-seeds from fresh drone data
    setEditForms((prev) => {
      const next = { ...prev };
      delete next[droneId];
      return next;
    });
  };

  const confirmDelete = (droneId) => setConfirmDeleteId(droneId);
  const cancelDelete  = ()        => setConfirmDeleteId(null);
  const doDelete      = (droneId) => {
    setConfirmDeleteId(null);
    if (onDeleteDrone) onDeleteDrone(droneId);
  };

  // -------------------------------------------------------------------------
  return (
    <div
      className="profile-sheet"
      role="dialog"
      aria-modal="true"
      aria-label={`${s.pilot} ${pilot?.username}`}
    >
      <div className="profile-sheet__backdrop" onClick={onClose} />

      <div className="profile-sheet__panel">
        {/* ------------------------------------------------------------------ */}
        {/* HEADER                                                              */}
        {/* ------------------------------------------------------------------ */}
        <div className="profile-sheet__header">
          <div className="profile-sheet__pilot-info">
            <AvatarPicker
              pilotId={pilot?.id}
              size={52}
              editable={isOwner}
            />
            <div>
              <h2 className="profile-sheet__username">{pilot?.username}</h2>
              <p className="profile-sheet__id">{s.pilot} #{pilot?.id}</p>
            </div>
          </div>
          <button className="btn-icon" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* BODY                                                                */}
        {/* ------------------------------------------------------------------ */}
        <div className="profile-sheet__body">
          <h3 className="profile-sheet__section-title">
            {s.hangar}
            <span className="profile-sheet__drone-count">{drones.length}</span>
          </h3>

          {drones.length === 0 && (
            <p className="empty-text">{s.no_drones}</p>
          )}

          {drones.map((drone) => {
            const isConflict = conflictIds.has(drone.id);
            const isExpanded = expandedId === drone.id;
            const tab        = activeTab[drone.id] ?? 'info';
            const form       = editForms[drone.id];

            return (
              <div
                key={drone.id}
                className={`profile-drone-card${isConflict ? ' profile-drone-card--conflict' : ''}`}
              >
                {/* ---- card header ---- */}
                <div className="profile-drone-card__top">
                  <button
                    className="profile-drone-card__toggle"
                    onClick={() => openCard(drone)}
                    aria-expanded={isExpanded}
                  >
                    <span className="profile-drone-card__name">{drone.name}</span>
                    <span className="profile-drone-card__meta">
                      {isConflict && (
                        <span className="conflict-badge conflict-badge--sm">
                          <AlertTriangle size={10} /> {s.conflict}
                        </span>
                      )}
                      <span className="profile-drone-card__freq">
                        {drone.frequency_mhz ? `${drone.frequency_mhz} MHz` : '—'}
                      </span>
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </span>
                  </button>

                  {/* Owner action buttons */}
                  {isOwner && confirmDeleteId !== drone.id && (
                    <div className="profile-drone-card__actions">
                      <button
                        className="btn-icon btn-icon--sm"
                        onClick={() => { openCard(drone); switchTab(drone.id, 'edit'); }}
                        aria-label={s.edit}
                        title={s.edit}
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        className="btn-icon btn-icon--sm btn-icon--danger"
                        onClick={() => confirmDelete(drone.id)}
                        aria-label={s.delete}
                        title={s.delete}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}

                  {/* Confirm-delete inline */}
                  {isOwner && confirmDeleteId === drone.id && (
                    <div className="profile-drone-card__confirm-delete">
                      <span className="confirm-delete__label">{s.delete_confirm}</span>
                      <button
                        className="btn-danger btn-danger--sm"
                        onClick={() => doDelete(drone.id)}
                      >
                        {s.delete}
                      </button>
                      <button
                        className="btn-ghost btn-ghost--sm"
                        onClick={cancelDelete}
                      >
                        {s.cancel}
                      </button>
                    </div>
                  )}
                </div>

                {/* ---- quick chips (always visible) ---- */}
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

                {/* ---- expanded section with tabs ---- */}
                {isExpanded && (
                  <div className="profile-drone-card__expanded">
                    {/* Tab bar */}
                    <div className="drone-tabs">
                      <button
                        className={`drone-tab${tab === 'info' ? ' drone-tab--active' : ''}`}
                        onClick={() => switchTab(drone.id, 'info')}
                      >
                        <Info size={13} /> {s.tab_info}
                      </button>
                      <button
                        className={`drone-tab${tab === 'specs' ? ' drone-tab--active' : ''}`}
                        onClick={() => switchTab(drone.id, 'specs')}
                      >
                        <Cpu size={13} /> {s.tab_specs}
                      </button>
                      {isOwner && (
                        <button
                          className={`drone-tab${tab === 'edit' ? ' drone-tab--active' : ''}`}
                          onClick={() => switchTab(drone.id, 'edit')}
                        >
                          <Pencil size={13} /> {s.tab_edit}
                        </button>
                      )}
                    </div>

                    {/* Tab content */}
                    <div className="drone-tab-content">
                      {tab === 'info'  && <InfoView  drone={drone} s={s} />}
                      {tab === 'specs' && <SpecsView drone={drone} s={s} />}
                      {tab === 'edit'  && isOwner && form && (
                        <EditView
                          droneId={drone.id}
                          form={form}
                          patchForm={patchForm}
                          onSave={saveEdit}
                          onCancel={() => switchTab(drone.id, 'info')}
                          s={s}
                        />
                      )}
                    </div>
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
// InfoView — детали частоты и флайт-тайм
// ---------------------------------------------------------------------------
function InfoView({ drone, s }) {
  const rows = [
    { label: s.power,  value: drone.power_mw  ? `${drone.power_mw} mW`  : null },
    { label: s.size,   value: drone.drone_size || null },
    { label: s.weight, value: drone.weight_g   ? `${drone.weight_g} g`  : null },
    { label: s.battery,value: drone.battery    || null },
  ].filter((r) => r.value);

  return (
    <div className="specs-view">
      {rows.length > 0 ? (
        <div className="specs-grid">
          {rows.map(({ label, value }) => (
            <div key={label} className="specs-row">
              <span className="specs-label">{label}</span>
              <span className="specs-value">{value}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="empty-text" style={{ fontSize: '12px' }}>{s.no_specs}</p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// SpecsView — железо дрона
// ---------------------------------------------------------------------------
function SpecsView({ drone, s }) {
  const specs = [
    { label: s.fc,     value: drone.fc     },
    { label: s.esc,    value: drone.esc    },
    { label: s.motor,  value: drone.motor  },
    { label: s.props,  value: drone.props  },
    { label: s.camera, value: drone.camera },
    { label: s.vtx,    value: drone.vtx    },
    { label: s.rx,     value: drone.rx     },
  ].filter((r) => r.value);

  if (specs.length === 0 && !drone.notes) {
    return <p className="empty-text" style={{ fontSize: '12px' }}>{s.no_specs}</p>;
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
      {drone.notes && <p className="specs-notes">{drone.notes}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// EditView — форма редактирования
// ---------------------------------------------------------------------------
function EditView({ droneId, form, patchForm, onSave, onCancel, s }) {
  const patch = (field) => (e) => patchForm(droneId, { [field]: e.target.value });

  return (
    <div className="edit-form">
      {/* Drone name */}
      <div className="form-field">
        <label className="field-label">{s.name}</label>
        <input
          className="field-input"
          value={form.name}
          onChange={patch('name')}
          placeholder="My Drone"
        />
      </div>

      {/* Frequency */}
      <p className="edit-form__section-label">{s.freq_section}</p>
      <FrequencySelector
        value={{
          videoType:     form.videoType,
          band:          form.band,
          channel:       form.channel,
          frequency_mhz: form.frequency_mhz,
        }}
        onChange={(v) =>
          patchForm(droneId, {
            videoType:     v.videoType,
            band:          v.band,
            channel:       v.channel,
            frequency_mhz: v.frequency_mhz,
            video_system:  v.videoType === 'analog'
                             ? `Analog / ${v.band}`
                             : form.video_system,
          })
        }
      />

      {/* Basic info */}
      <p className="edit-form__section-label">{s.basic_section}</p>
      <div className="form-row">
        <div className="form-field">
          <label className="field-label">{s.power}</label>
          <input
            type="number"
            className="field-input"
            value={form.power_mw}
            onChange={patch('power_mw')}
            min={25} max={2000}
          />
        </div>
        <div className="form-field">
          <label className="field-label">{s.size}</label>
          <select
            className="field-input"
            value={form.drone_size}
            onChange={patch('drone_size')}
          >
            {SIZES.map((sz) => <option key={sz} value={sz}>{sz}</option>)}
          </select>
        </div>
      </div>

      <div className="form-row">
        <div className="form-field">
          <label className="field-label">{s.weight}</label>
          <input
            type="number"
            className="field-input"
            placeholder="250"
            value={form.weight_g}
            onChange={patch('weight_g')}
            min={1}
          />
        </div>
        <div className="form-field">
          <label className="field-label">{s.battery}</label>
          <input
            type="text"
            className="field-input"
            placeholder="4S 1500mAh"
            value={form.battery}
            onChange={patch('battery')}
          />
        </div>
      </div>

      {/* Specs */}
      <p className="edit-form__section-label">{s.specs_section}</p>
      <div className="form-row">
        <SpecField label={s.fc}     field="fc"     droneId={droneId} form={form} patchForm={patchForm} />
        <SpecField label={s.esc}    field="esc"    droneId={droneId} form={form} patchForm={patchForm} />
      </div>
      <div className="form-row">
        <SpecField label={s.motor}  field="motor"  droneId={droneId} form={form} patchForm={patchForm} />
        <SpecField label={s.props}  field="props"  droneId={droneId} form={form} patchForm={patchForm} />
      </div>
      <div className="form-row">
        <SpecField label={s.camera} field="camera" droneId={droneId} form={form} patchForm={patchForm} />
        <SpecField label={s.vtx}    field="vtx"    droneId={droneId} form={form} patchForm={patchForm} />
      </div>
      <div className="form-row">
        <SpecField label={s.rx}     field="rx"     droneId={droneId} form={form} patchForm={patchForm} />
      </div>

      <div className="form-field">
        <label className="field-label">{s.notes}</label>
        <textarea
          className="field-input field-textarea"
          placeholder={s.notes_placeholder}
          value={form.notes}
          onChange={patch('notes')}
          rows={3}
        />
      </div>

      {/* Save / Cancel */}
      <div className="edit-form__actions">
        <button className="btn-primary" onClick={() => onSave(droneId)}>
          <Save size={14} /> {s.save}
        </button>
        <button className="btn-ghost" onClick={onCancel}>
          {s.cancel}
        </button>
      </div>
    </div>
  );
}

function SpecField({ label, field, droneId, form, patchForm }) {
  return (
    <div className="form-field">
      <label className="field-label">{label}</label>
      <input
        type="text"
        className="field-input"
        value={form[field] ?? ''}
        onChange={(e) => patchForm(droneId, { [field]: e.target.value })}
      />
    </div>
  );
}

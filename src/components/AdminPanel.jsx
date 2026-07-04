import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck, Users, MapPin, BarChart2, Check, X, Trash2,
  UserX, UserCheck, RefreshCw, ChevronDown, ChevronUp, AlertTriangle
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Stat card
// ---------------------------------------------------------------------------
function StatCard({ label, value, sub, color }) {
  return (
    <div className="ap-stat-card" style={{ '--card-accent': color || 'var(--accent)' }}>
      <span className="ap-stat-card__value">{value ?? '—'}</span>
      <span className="ap-stat-card__label">{label}</span>
      {sub && <span className="ap-stat-card__sub">{sub}</span>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Spot review row
// ---------------------------------------------------------------------------
function SpotRow({ spot, onApprove, onReject, onDelete, isSuperAdmin }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`ap-spot-row ap-spot-row--${spot.status}`}>
      <button className="ap-spot-row__header" onClick={() => setOpen((v) => !v)}>
        <div className="ap-spot-row__info">
          <span className={`ap-spot-row__badge ap-spot-row__badge--${spot.status}`}>
            {spot.status}
          </span>
          <span className="ap-spot-row__name">{spot.name}</span>
          <span className="ap-spot-row__author">by {spot.pilot_username}</span>
        </div>
        {open ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
      </button>
      {open && (
        <div className="ap-spot-row__body">
          {spot.description && <p className="ap-spot-row__desc">{spot.description}</p>}
          <p className="ap-spot-row__coords">
            {spot.lat.toFixed(5)}, {spot.lng.toFixed(5)}
          </p>
          {spot.tags?.length > 0 && (
            <div className="ap-spot-row__tags">
              {spot.tags.map((tag) => <span key={tag} className="tag">{tag}</span>)}
            </div>
          )}
          <div className="ap-spot-row__actions">
            {spot.status !== 'approved' && (
              <button className="btn-sm btn-sm--success" onClick={() => onApprove(spot.id)}>
                <Check size={13} /> Approve
              </button>
            )}
            {spot.status !== 'rejected' && (
              <button className="btn-sm btn-sm--danger" onClick={() => onReject(spot.id)}>
                <X size={13} /> Reject
              </button>
            )}
            {isSuperAdmin && (
              <button className="btn-sm btn-sm--ghost" onClick={() => onDelete(spot.id)}>
                <Trash2 size={13} /> Delete
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pilot row (admin list)
// ---------------------------------------------------------------------------
function PilotRow({ pilot, isSuperAdmin, pilotId, onDelete, onGrant, onRevoke }) {
  const [confirmDel, setConfirmDel] = useState(false);
  return (
    <div className={`ap-pilot-row${pilot.is_admin ? ' ap-pilot-row--admin' : ''}`}>
      <div className="ap-pilot-row__info">
        <span className="ap-pilot-row__id">#{pilot.id}</span>
        <span className="ap-pilot-row__name">{pilot.username}</span>
        {pilot.is_admin && (
          <span className="admin-badge" style={{ fontSize: 9, padding: '1px 6px' }}>ADMIN</span>
        )}
        <span className="ap-pilot-row__stats">
          {pilot.markers}m · {pilot.drones}d
        </span>
      </div>
      <div className="ap-pilot-row__actions">
        {isSuperAdmin && pilot.id !== pilotId && (
          pilot.is_admin
            ? <button className="btn-sm btn-sm--ghost" onClick={() => onRevoke(pilot.username)} title="Revoke admin">
                <UserX size={13} />
              </button>
            : <button className="btn-sm btn-sm--accent" onClick={() => onGrant(pilot.username)} title="Grant admin">
                <UserCheck size={13} />
              </button>
        )}
        {isSuperAdmin && pilot.id !== 0 && pilot.id !== pilotId && (
          confirmDel
            ? <>
                <button className="btn-sm btn-sm--danger" onClick={() => { onDelete(pilot.id); setConfirmDel(false); }}>
                  Confirm
                </button>
                <button className="btn-sm btn-sm--ghost" onClick={() => setConfirmDel(false)}>
                  Cancel
                </button>
              </>
            : <button className="btn-sm btn-sm--danger" onClick={() => setConfirmDel(true)} title="Delete pilot">
                <UserX size={13} />
              </button>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main AdminPanel component
// ---------------------------------------------------------------------------
const TABS = ['stats', 'spots', 'pilots', 'admins'];

export default function AdminPanel({ pilotId, isSuperAdmin, t, demoMode, onClose, apiBase }) {
  const [tab, setTab] = useState('stats');
  const [stats, setStats]   = useState(null);
  const [spots, setSpots]   = useState([]);
  const [pilots, setPilots] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [spotsFilter, setSpotsFilter] = useState('pending');
  const [loading, setLoading] = useState(false);
  const [grantInput, setGrantInput] = useState('');
  const [msg, setMsg] = useState('');

  const flash = (m) => { setMsg(m); setTimeout(() => setMsg(''), 3000); };

  const loadStats = useCallback(async () => {
    if (demoMode) return;
    try {
      const r = await fetch(`${apiBase}/stats?pilot_id=${pilotId}`);
      if (r.ok) setStats(await r.json());
    } catch {}
  }, [pilotId, demoMode]);

  const loadSpots = useCallback(async () => {
    if (demoMode) return;
    try {
      const r = await fetch(`${apiBase}/spots?status=${spotsFilter}`);
      if (r.ok) setSpots(await r.json());
    } catch {}
  }, [spotsFilter, demoMode]);

  const loadPilots = useCallback(async () => {
    if (demoMode) return;
    try {
      const r = await fetch(`${apiBase}/pilots/all?pilot_id=${pilotId}`);
      if (r.ok) setPilots(await r.json());
    } catch {}
  }, [pilotId, demoMode]);

  const loadAdmins = useCallback(async () => {
    if (demoMode) return;
    try {
      const r = await fetch(`${apiBase}/admins?pilot_id=${pilotId}`);
      if (r.ok) setAdmins(await r.json());
    } catch {}
  }, [pilotId, demoMode]);

  useEffect(() => {
    setLoading(true);
    const tasks = { stats: loadStats, spots: loadSpots, pilots: loadPilots, admins: loadAdmins };
    (tasks[tab] || loadStats)().finally(() => setLoading(false));
  }, [tab, loadStats, loadSpots, loadPilots, loadAdmins]);

  useEffect(() => { if (tab === 'spots') loadSpots(); }, [spotsFilter, tab, loadSpots]);

  // --- Spot actions ---
  const approveSpot = async (id) => {
    await fetch(`${apiBase}/spots/${id}/approve?pilot_id=${pilotId}`, { method: 'POST' });
    loadSpots(); flash('Spot approved');
  };
  const rejectSpot = async (id) => {
    await fetch(`${apiBase}/spots/${id}/reject?pilot_id=${pilotId}`, { method: 'POST' });
    loadSpots(); flash('Spot rejected');
  };
  const deleteSpot = async (id) => {
    await fetch(`${apiBase}/spots/${id}?pilot_id=${pilotId}`, { method: 'DELETE' });
    loadSpots(); flash('Spot deleted');
  };

  // --- Pilot actions ---
  const deletePilot = async (id) => {
    await fetch(`${apiBase}/pilots/${id}?pilot_id=${pilotId}`, { method: 'DELETE' });
    loadPilots(); flash('Pilot deleted');
  };
  const grantAdmin = async (username) => {
    await fetch(`${apiBase}/admins/grant?pilot_id=${pilotId}&target_username=${encodeURIComponent(username)}`, { method: 'POST' });
    loadPilots(); loadAdmins(); flash(`Admin granted to ${username}`);
  };
  const revokeAdmin = async (username) => {
    await fetch(`${apiBase}/admins/revoke?pilot_id=${pilotId}&target_username=${encodeURIComponent(username)}`, { method: 'POST' });
    loadPilots(); loadAdmins(); flash(`Admin revoked from ${username}`);
  };

  const tabLabels = {
    stats:  { label: t.admin_stats ?? 'Stats',   icon: BarChart2 },
    spots:  { label: t.spot_approval ?? 'Spots', icon: MapPin },
    pilots: { label: t.admin_pilots ?? 'Pilots', icon: Users },
    admins: { label: t.admin_manage_admins ?? 'Admins', icon: ShieldCheck },
  };

  const pendingCount = spots.filter((s) => s.status === 'pending').length;

  return (
    <div className="fullscreen-tab admin-panel">
      {/* Header */}
      <div className="tab-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ShieldCheck size={18} color="var(--accent)" />
          <h2 className="tab-title" style={{ margin: 0 }}>{t.admin_panel ?? 'Admin Panel'}</h2>
          {isSuperAdmin && <span className="admin-badge">SUPER</span>}
        </div>
        <button className="btn-icon" onClick={() => { loadStats(); loadSpots(); loadPilots(); loadAdmins(); }} aria-label="Refresh">
          <RefreshCw size={17} />
        </button>
      </div>

      {msg && (
        <div className="ap-flash">{msg}</div>
      )}

      {demoMode && (
        <div className="ap-demo-warn">
          <AlertTriangle size={14} />
          Demo mode — admin panel requires backend
        </div>
      )}

      {/* Tab bar */}
      <div className="ap-tabs">
        {TABS.map((key) => {
          const { label, icon: Icon } = tabLabels[key];
          const badge = key === 'spots' && pendingCount > 0 ? pendingCount : null;
          return (
            <button
              key={key}
              className={`ap-tab${tab === key ? ' ap-tab--active' : ''}`}
              onClick={() => setTab(key)}
            >
              <Icon size={14} />
              {label}
              {badge && <span className="ap-tab__badge">{badge}</span>}
            </button>
          );
        })}
      </div>

      <div className="ap-body">
        {loading && <div className="ap-loading">Loading...</div>}

        {/* STATS */}
        {tab === 'stats' && !loading && (
          <div className="ap-stats-grid">
            <StatCard label="Pilots" value={stats?.total_pilots} color="var(--accent)" />
            <StatCard label="Active markers" value={stats?.active_markers} sub={`/ ${stats?.total_markers ?? '?'} total`} color="#60a5fa" />
            <StatCard label="Spots" value={stats?.total_spots} sub={`${stats?.pending_spots ?? 0} pending`} color="#4ade80" />
            <StatCard label="Messages" value={stats?.total_messages} color="#c084fc" />
          </div>
        )}

        {/* SPOTS */}
        {tab === 'spots' && !loading && (
          <div className="ap-spots">
            <div className="ap-filter-row">
              {['pending', 'approved', 'rejected', 'all'].map((f) => (
                <button
                  key={f}
                  className={`tag tag--btn${spotsFilter === f ? ' tag--btn-active' : ''}`}
                  onClick={() => setSpotsFilter(f)}
                >
                  {f}
                </button>
              ))}
            </div>
            {spots.length === 0 && <p className="empty-text">No spots in this filter.</p>}
            {spots.map((s) => (
              <SpotRow
                key={s.id} spot={s}
                isSuperAdmin={isSuperAdmin}
                onApprove={approveSpot}
                onReject={rejectSpot}
                onDelete={deleteSpot}
              />
            ))}
          </div>
        )}

        {/* PILOTS */}
        {tab === 'pilots' && !loading && (
          <div className="ap-pilots">
            <p className="section-desc">{pilots.length} pilots registered</p>
            {pilots.map((p) => (
              <PilotRow
                key={p.id} pilot={p}
                isSuperAdmin={isSuperAdmin}
                pilotId={pilotId}
                onDelete={deletePilot}
                onGrant={grantAdmin}
                onRevoke={revokeAdmin}
              />
            ))}
          </div>
        )}

        {/* ADMINS */}
        {tab === 'admins' && !loading && (
          <div className="ap-admins">
            {isSuperAdmin && (
              <div className="ap-grant-row">
                <input
                  className="field-input"
                  placeholder="Callsign..."
                  value={grantInput}
                  onChange={(e) => setGrantInput(e.target.value)}
                  style={{ flex: 1 }}
                />
                <button
                  className="btn-primary btn-primary--sm"
                  onClick={() => { if (grantInput.trim()) { grantAdmin(grantInput.trim()); setGrantInput(''); } }}
                >
                  {t.admin_grant ?? 'Grant'}
                </button>
              </div>
            )}
            {admins.length === 0 && <p className="empty-text">No admins.</p>}
            {admins.map((a) => (
              <div key={a.username} className={`ap-admin-row${a.role === 'super' ? ' ap-admin-row--super' : ''}`}>
                <span className="ap-admin-row__name">{a.username}</span>
                <span className={`ap-admin-row__role ${a.role === 'super' ? 'admin-badge' : 'tag'}`}>
                  {a.role}
                </span>
                {isSuperAdmin && a.role !== 'super' && (
                  <button className="btn-sm btn-sm--danger" onClick={() => revokeAdmin(a.username)}>
                    {t.admin_revoke ?? 'Revoke'}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

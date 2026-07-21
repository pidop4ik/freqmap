import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  UserPlus, Check, Ban, MessageCircle, Users, Radio,
  Send, ChevronLeft, UserMinus, Search,
} from 'lucide-react';
import AvatarPicker from './AvatarPicker.jsx';

const API = '/api';

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------
const fmt = (iso) => {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now - d;
  if (diffMs < 60_000) return 'only now';
  if (diffMs < 3_600_000) return `${Math.floor(diffMs / 60_000)} min ago`;
  if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString([], { day: '2-digit', month: 'short' });
};

// ---------------------------------------------------------------------------
// Main ChatSheet
// ---------------------------------------------------------------------------
export default function ChatSheet({ pilotId, username, lang, t, markers, onClose, onUnreadChange, onThreadChange }) {
  const [tab, setTab] = useState('friends'); // 'friends' | 'dm' | 'location'
  const [friendsData, setFriendsData] = useState({ friends: [], incoming: [], outgoing: [] });
  const [activeDM, setActiveDM] = useState(null);   // { id, username }
  const [activeLocation, setActiveLocation] = useState(null); // marker object

  const isInner = activeDM || activeLocation;

  useEffect(() => {
    onThreadChange?.(!!isInner);
    return () => onThreadChange?.(false);
  }, [isInner, onThreadChange]);


  const refreshFriends = useCallback(async () => {
    try {
      const r = await fetch(`${API}/friends/${pilotId}`);
      if (r.ok) setFriendsData(await r.json());
    } catch { /* offline */ }
  }, [pilotId]);

  useEffect(() => { refreshFriends(); }, [refreshFriends]);

  // polling unread count every 10s
  useEffect(() => {
    const tick = async () => {
      try {
        const r = await fetch(`${API}/messages/${pilotId}/unread/count`);
        if (r.ok) {
          const { count } = await r.json();
          onUnreadChange?.(count);
        }
      } catch { /* offline */ }
    };
    tick();
    const id = setInterval(tick, 10_000);
    return () => clearInterval(id);
  }, [pilotId, onUnreadChange]);

  // Navigate back from DM/location
  const goBack = () => {
    setActiveDM(null);
    setActiveLocation(null);
  };

  return (
    <div className={`fullscreen-tab chat-sheet${isInner ? ' chat-sheet--thread' : ''}`}>
      {/* Header */}
      <div className="tab-header">
        <div className="chat-sheet__header-left">
          {isInner && (
            <button className="btn-icon" onClick={goBack} aria-label="Back">
              <ChevronLeft size={20} />
            </button>
          )}
          <h2 className="tab-title" style={{ margin: 0 }}>
            {activeDM ? activeDM.username
              : activeLocation ? (t.location_chat ?? 'Location chat')
              : (t.chat ?? 'Chat')}
          </h2>
        </div>
      </div>

      {/* Inner: DM thread */}
      {activeDM && (
        <DMThread
          pilotId={pilotId}
          other={activeDM}
          t={t}
          onUnreadChange={onUnreadChange}
        />
      )}

      {/* Inner: Location chat */}
      {!activeDM && activeLocation && (
        <LocationThread
          pilotId={pilotId}
          username={username}
          marker={activeLocation}
          t={t}
        />
      )}

      {/* Main view */}
      {!isInner && (
        <>
          {/* Tab bar */}
          <div className="chat-tabs">
            <button
              className={`chat-tab${tab === 'friends' ? ' chat-tab--active' : ''}`}
              onClick={() => setTab('friends')}
            >
              <Users size={15} />
              {t.friends ?? 'Friends'}
              {friendsData.incoming.length > 0 && (
                <span className="chat-tab__badge">{friendsData.incoming.length}</span>
              )}
            </button>
            <button
              className={`chat-tab${tab === 'dm' ? ' chat-tab--active' : ''}`}
              onClick={() => setTab('dm')}
            >
              <MessageCircle size={15} />
              {t.messages ?? 'Messages'}
            </button>
            <button
              className={`chat-tab${tab === 'location' ? ' chat-tab--active' : ''}`}
              onClick={() => setTab('location')}
            >
              <Radio size={15} />
              {t.location_tab ?? 'Location'}
            </button>
          </div>

          <div className="chat-body">
            {tab === 'friends' && (
              <FriendsTab
                pilotId={pilotId}
                friendsData={friendsData}
                refresh={refreshFriends}
                onOpenDM={(f) => { setActiveDM(f); setTab('dm'); }}
                t={t}
              />
            )}
            {tab === 'dm' && (
              <DMListTab
                pilotId={pilotId}
                friends={friendsData.friends}
                onOpen={(f) => setActiveDM(f)}
                t={t}
              />
            )}
            {tab === 'location' && (
              <LocationListTab
                markers={markers}
                onOpen={(m) => setActiveLocation(m)}
                t={t}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// FriendsTab
// ---------------------------------------------------------------------------
function FriendsTab({ pilotId, friendsData, refresh, onOpenDM, t }) {
  const [search, setSearch] = useState('');
  const [searchResult, setSearchResult] = useState(null); // null | 'not_found' | { id, username }
  const [searching, setSearching] = useState(false);
  const [loadingId, setLoadingId] = useState(null);

  const doSearch = async () => {
    if (!search.trim()) return;
    setSearching(true);
    setSearchResult(null);
    try {
      // We list all pilots via a simple search endpoint (or just try login with wrong pw to check existence — instead we add GET /api/pilots/search)
      const r = await fetch(`${API}/pilots/search?q=${encodeURIComponent(search.trim())}`);
      if (!r.ok) { setSearchResult('not_found'); return; }
      const data = await r.json();
      // filter out self
      const filtered = data.filter((p) => p.id !== pilotId);
      setSearchResult(filtered.length > 0 ? filtered : 'not_found');
    } catch {
      setSearchResult('not_found');
    } finally {
      setSearching(false);
    }
  };

  const sendRequest = async (toId) => {
    setLoadingId(toId);
    try {
      await fetch(`${API}/friends/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from_id: pilotId, to_id: toId }),
      });
      refresh();
      setSearchResult(null);
      setSearch('');
    } finally { setLoadingId(null); }
  };

  const acceptRequest = async (fromId) => {
    setLoadingId(fromId);
    try {
      await fetch(`${API}/friends/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from_id: fromId, to_id: pilotId }),
      });
      refresh();
    } finally { setLoadingId(null); }
  };

  const rejectRequest = async (fromId) => {
    setLoadingId(fromId);
    try {
      await fetch(`${API}/friends/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from_id: fromId, to_id: pilotId }),
      });
      refresh();
    } finally { setLoadingId(null); }
  };

  const removeFriend = async (otherId) => {
    setLoadingId(otherId);
    try {
      await fetch(`${API}/friends?from_id=${pilotId}&to_id=${otherId}`, { method: 'DELETE' });
      refresh();
    } finally { setLoadingId(null); }
  };

  return (
    <div className="friends-tab">
      {/* Search */}
      <div className="friends-search">
        <div className="friends-search__input-wrap">
          <Search size={14} className="friends-search__icon" />
          <input
            className="friends-search__input"
            placeholder={t.search_pilots ?? 'Search by callsign...'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) doSearch(); }}
          />
        </div>
        <button className="btn-primary btn-primary--sm" onClick={doSearch} disabled={searching}>
          {searching ? '...' : (t.find ?? 'Find')}
        </button>
      </div>

      {/* Search results */}
      {searchResult && searchResult !== 'not_found' && Array.isArray(searchResult) && (
        <div className="friends-search-results">
          {searchResult.map((p) => {
            const alreadyFriend = friendsData.friends.some((f) => f.id === p.id);
            const pending = friendsData.outgoing.some((f) => f.id === p.id);
            return (
              <div key={p.id} className="friend-row">
                <div className="friend-row__info">
                  <span className="friend-row__id">#{p.id}</span>
                  <span className="friend-row__name">{p.username}</span>
                </div>
                {alreadyFriend ? (
                  <span className="friend-row__tag">{t.already_friends ?? 'Friends'}</span>
                ) : pending ? (
                  <span className="friend-row__tag friend-row__tag--pending">{t.request_sent ?? 'Sent'}</span>
                ) : (
                  <button
                    className="btn-icon btn-icon--sm"
                    onClick={() => sendRequest(p.id)}
                    disabled={loadingId === p.id}
                    title={t.add_friend ?? 'Add friend'}
                  >
                    <UserPlus size={15} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
      {searchResult === 'not_found' && (
        <p className="empty-text">{t.pilot_not_found ?? 'Pilot not found'}</p>
      )}

      {/* Incoming requests */}
      {friendsData.incoming.length > 0 && (
        <div className="friends-section">
          <p className="friends-section__label">{t.incoming_requests ?? 'Incoming requests'}</p>
          {friendsData.incoming.map((req) => (
            <div key={req.id} className="friend-row friend-row--request">
              <div className="friend-row__info">
                <AvatarPicker pilotId={req.from_id} size={28} editable={false} />
                <span className="friend-row__id">#{req.from_id}</span>
                <span className="friend-row__name">{req.username}</span>
              </div>
              <div className="friend-row__actions">
                <button
                  className="btn-icon btn-icon--sm btn-icon--success"
                  onClick={() => acceptRequest(req.from_id)}
                  disabled={loadingId === req.from_id}
                  title={t.accept ?? 'Accept'}
                >
                  <Check size={15} />
                </button>
                <button
                  className="btn-icon btn-icon--sm btn-icon--danger"
                  onClick={() => rejectRequest(req.from_id)}
                  disabled={loadingId === req.from_id}
                  title={t.reject ?? 'Reject'}
                >
                  <Ban size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Friends list */}
      <div className="friends-section">
        <p className="friends-section__label">
          {t.my_friends ?? 'My friends'} ({friendsData.friends.length})
        </p>
        {friendsData.friends.length === 0 && (
          <p className="empty-text">{t.no_friends ?? 'No friends yet. Search by callsign above.'}</p>
        )}
        {friendsData.friends.map((f) => (
          <div key={f.id} className="friend-row">
            <div className="friend-row__info">
              <AvatarPicker pilotId={f.id} size={28} editable={false} />
              <span className="friend-row__id">#{f.id}</span>
              <span className="friend-row__name">{f.username}</span>
            </div>
            <div className="friend-row__actions">
              <button
                className="btn-icon btn-icon--sm"
                onClick={() => onOpenDM(f)}
                title={t.send_message ?? 'Message'}
              >
                <MessageCircle size={15} />
              </button>
              <button
                className="btn-icon btn-icon--sm btn-icon--danger"
                onClick={() => removeFriend(f.id)}
                disabled={loadingId === f.id}
                title={t.remove_friend ?? 'Remove'}
              >
                <UserMinus size={15} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// DMListTab — list of friends to start/open chats
// ---------------------------------------------------------------------------
function DMListTab({ pilotId, friends, onOpen, t }) {
  if (friends.length === 0) {
    return (
      <p className="empty-text" style={{ marginTop: '24px' }}>
        {t.no_friends_for_dm ?? 'Add friends first to start messaging.'}
      </p>
    );
  }
  return (
    <div className="dm-list">
      {friends.map((f) => (
        <button key={f.id} className="dm-list__item" onClick={() => onOpen(f)}>
          <div className="dm-list__avatar"><AvatarPicker pilotId={f.id} size={38} editable={false} /></div>
          <div className="dm-list__info">
            <span className="dm-list__name">{f.username}</span>
            <span className="dm-list__sub">#{f.id}</span>
          </div>
          <MessageCircle size={16} className="dm-list__arrow" />
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// DMThread — private chat with one friend
// ---------------------------------------------------------------------------
function DMThread({ pilotId, other, t, onUnreadChange }) {
  const [msgs, setMsgs] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);
  const sinceRef = useRef(null);

  const loadMsgs = useCallback(async (since = null) => {
    try {
      const url = `${API}/messages/${pilotId}/${other.id}${since ? `?since=${since}` : ''}`;
      const r = await fetch(url);
      if (!r.ok) return;
      const data = await r.json();
      if (since) {
        setMsgs((prev) => [...prev, ...data]);
      } else {
        setMsgs(data);
      }
      if (data.length > 0) sinceRef.current = data[data.length - 1].created_at;
      // update unread badge
      onUnreadChange?.();
    } catch { /* offline */ }
  }, [pilotId, other.id, onUnreadChange]);

  useEffect(() => {
    loadMsgs();
    const id = setInterval(() => loadMsgs(sinceRef.current), 5_000);
    return () => clearInterval(id);
  }, [loadMsgs]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs]);

  const send = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      const r = await fetch(`${API}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from_id: pilotId, to_id: other.id, text: text.trim() }),
      });
      if (r.ok) {
        setText('');
        await loadMsgs(sinceRef.current);
      }
    } finally { setSending(false); }
  };

  return (
    <div className="chat-thread">
      <div className="chat-thread__messages">
        {msgs.length === 0 && (
          <p className="empty-text">{t.no_messages ?? 'No messages yet. Say hi!'}</p>
        )}
        {msgs.map((m) => {
          const isMine = m.from_id === pilotId;
          return (
            <div key={m.id} className={`chat-bubble ${isMine ? 'chat-bubble--mine' : 'chat-bubble--theirs'}`}>
              <p className="chat-bubble__text">{m.text}</p>
              <span className="chat-bubble__time">{fmt(m.created_at)}</span>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      <div className="chat-thread__input">
        <input
          className="chat-thread__textbox"
          placeholder={t.type_message ?? 'Type a message...'}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.nativeEvent.isComposing && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
        />
        <button className="chat-thread__send" onClick={send} disabled={sending || !text.trim()}>
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// LocationListTab — pick a marker to open its public chat
// ---------------------------------------------------------------------------
function LocationListTab({ markers, onOpen, t }) {
  if (markers.length === 0) {
    return (
      <p className="empty-text" style={{ marginTop: '24px' }}>
        {t.no_markers_for_chat ?? 'No active markers on the map. Place one to chat.'}
      </p>
    );
  }
  return (
    <div className="dm-list">
      {markers.map((m) => (
        <button key={m.id} className="dm-list__item" onClick={() => onOpen(m)}>
          <div className="dm-list__avatar dm-list__avatar--location">
            <Radio size={14} />
          </div>
          <div className="dm-list__info">
            <span className="dm-list__name">{m.pilot_username}</span>
            <span className="dm-list__sub">
              {m.drone?.frequency_mhz ? `${m.drone.frequency_mhz} MHz` : m.drone?.band ?? ''}
              {' · '}{m.coordinates?.lat?.toFixed(4)}, {m.coordinates?.lng?.toFixed(4)}
            </span>
          </div>
          <MessageCircle size={16} className="dm-list__arrow" />
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// LocationThread — public group chat tied to a marker
// ---------------------------------------------------------------------------
function LocationThread({ pilotId, username, marker, t }) {
  const [msgs, setMsgs] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);
  const sinceRef = useRef(null);

  const loadMsgs = useCallback(async (since = null) => {
    try {
      const url = `${API}/location-chat/${marker.id}${since ? `?since=${since}` : ''}`;
      const r = await fetch(url);
      if (!r.ok) return;
      const data = await r.json();
      if (since) {
        setMsgs((prev) => [...prev, ...data]);
      } else {
        setMsgs(data);
      }
      if (data.length > 0) sinceRef.current = data[data.length - 1].created_at;
    } catch { /* offline */ }
  }, [marker.id]);

  useEffect(() => {
    loadMsgs();
    const id = setInterval(() => loadMsgs(sinceRef.current), 5_000);
    return () => clearInterval(id);
  }, [loadMsgs]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs]);

  const send = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      const r = await fetch(`${API}/location-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pilot_id: pilotId, marker_id: marker.id, text: text.trim() }),
      });
      if (r.ok) {
        setText('');
        await loadMsgs(sinceRef.current);
      }
    } finally { setSending(false); }
  };

  return (
    <div className="chat-thread">
      <div className="chat-thread__messages">
        {msgs.length === 0 && (
          <p className="empty-text">{t.no_location_msgs ?? 'No messages yet at this location.'}</p>
        )}
        {msgs.map((m) => {
          const isMine = m.pilot_id === pilotId;
          return (
            <div key={m.id} className={`chat-bubble ${isMine ? 'chat-bubble--mine' : 'chat-bubble--theirs'}`}>
              {!isMine && <span className="chat-bubble__author">{m.pilot_username}</span>}
              <p className="chat-bubble__text">{m.text}</p>
              <span className="chat-bubble__time">{fmt(m.created_at)}</span>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      <div className="chat-thread__input">
        <input
          className="chat-thread__textbox"
          placeholder={t.type_message ?? 'Type a message...'}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.nativeEvent.isComposing && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
        />
        <button className="chat-thread__send" onClick={send} disabled={sending || !text.trim()}>
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}

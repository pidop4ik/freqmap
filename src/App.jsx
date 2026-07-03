import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Map as MapIcon, User, Settings, Crosshair, Globe, Trash2, Plus, AlertTriangle, Radio, X, ExternalLink } from 'lucide-react';

import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
import FrequencySelector from './components/FrequencySelector.jsx';
import DroneCard from './components/DroneCard.jsx';
import ConflictAlert from './components/ConflictAlert.jsx';
import PilotProfileSheet from './components/PilotProfileSheet.jsx';
import { findConflictingMarkers } from './data/frequencies.js';

// Fix Leaflet default icon
const DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});
L.Marker.prototype.options.icon = DefaultIcon;

const ConflictIcon = L.icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

const API_BASE = 'http://localhost:8000/api';

// ---------------------------------------------------------------------------
// i18n
// ---------------------------------------------------------------------------
const i18n = {
  ru: {
    search: 'Поиск локации...', map: 'Карта', profile: 'Профиль',
    settings: 'Настройки', login: 'Войти', register: 'Регистрация',
    nick: 'Ник', pass: 'Пароль', my_hangar: 'Мой ангар',
    add_drone: 'Добавить дрон', logout: 'Выйти',
    hours: 'ч', flight_time: 'Время полёта', frequency: 'Частота',
    power: 'Мощность', cancel: 'Отмена', confirm: 'OK',
    no_drones: 'Нет дронов. Добавьте дрон в профиле.',
    drone_name: 'Название дрона', size: 'Размер', weight: 'Вес',
    power_mw: 'Мощность (mW)', conflicts: 'Конфликты',
    no_conflicts: 'Конфликтов нет', put_marker: 'Поставить метку',
    remove: 'Удалить', demo_mode: 'Демо-режим (бэкенд недоступен)',
    backend_offline: 'Бэкенд не запущен. Приложение работает в режиме демо.',
  },
  en: {
    search: 'Search location...', map: 'Map', profile: 'Profile',
    settings: 'Settings', login: 'Login', register: 'Register',
    nick: 'Callsign', pass: 'Password', my_hangar: 'My Hangar',
    add_drone: 'Add Drone', logout: 'Logout',
    hours: 'h', flight_time: 'Flight Time', frequency: 'Frequency',
    power: 'Power', cancel: 'Cancel', confirm: 'OK',
    no_drones: 'No drones. Add one in profile.',
    drone_name: 'Drone Name', size: 'Size', weight: 'Weight (g)',
    power_mw: 'Power (mW)', conflicts: 'Conflicts',
    no_conflicts: 'No conflicts', put_marker: 'Place Marker',
    remove: 'Remove', demo_mode: 'Demo Mode (backend offline)',
    backend_offline: 'Backend not running. App works in demo mode.',
  },
  pl: {
    search: 'Szukaj lokalizacji...', map: 'Mapa', profile: 'Profil',
    settings: 'Ustawienia', login: 'Zaloguj', register: 'Zarejestruj',
    nick: 'Nick', pass: 'Hasło', my_hangar: 'Mój Hangar',
    add_drone: 'Dodaj drona', logout: 'Wyloguj',
    hours: 'h', flight_time: 'Czas lotu', frequency: 'Częstotliwość',
    power: 'Moc', cancel: 'Anuluj', confirm: 'OK',
    no_drones: 'Brak dronów. Dodaj w profilu.',
    drone_name: 'Nazwa drona', size: 'Rozmiar', weight: 'Waga (g)',
    power_mw: 'Moc (mW)', conflicts: 'Konflikty',
    no_conflicts: 'Brak konfliktów', put_marker: 'Postaw znacznik',
    remove: 'Usuń', demo_mode: 'Tryb demo (backend offline)',
    backend_offline: 'Backend nie działa. Aplikacja w trybie demo.',
  },
};

// ---------------------------------------------------------------------------
// Local storage helpers (demo mode)
// ---------------------------------------------------------------------------
const LS_PILOTS = 'freqmap_pilots';
const LS_DRONES = 'freqmap_drones';
const LS_MARKERS = 'freqmap_markers';

function lsGet(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
}
function lsSet(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
}
function lsNextId(arr) {
  return arr.length > 0 ? Math.max(...arr.map((x) => x.id)) + 1 : 1;
}

// ---------------------------------------------------------------------------
// Map helpers
// ---------------------------------------------------------------------------
function MapController({ center, zoom }) {
  const map = useMapEvents({});
  useEffect(() => {
    if (center && Array.isArray(center) && center[0] != null && center[1] != null) {
      map.setView(center, zoom ?? map.getZoom(), { animate: true });
    }
  }, [center, zoom, map]);
  return null;
}

function MapEvents({ onMapClick }) {
  useMapEvents({ click(e) { onMapClick(e.latlng); } });
  return null;
}

// ---------------------------------------------------------------------------
// Default new drone state
// ---------------------------------------------------------------------------
const defaultNewDrone = {
  name: '',
  videoType: 'analog',
  band: 'R',
  channel: 1,
  frequency_mhz: 5658,
  video_system: 'Analog / Raceband',
  power_mw: 200,
  drone_size: '5 inch',
  weight_g: null,
};

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------
export default function App() {
  const storedLang = typeof window !== 'undefined' ? (localStorage.getItem('freq_lang') || 'en') : 'en';
  const [lang, setLang] = useState(storedLang);
  const t = i18n[lang] || i18n.en;

  // FIX: parseInt(null) === NaN — используем Number() с проверкой
  const storedRawId = typeof window !== 'undefined' ? localStorage.getItem('freqmap_pilot_id') : null;
  const storedPilotId = storedRawId ? Number(storedRawId) : null;
  const [pilotId, setPilotId] = useState(Number.isFinite(storedPilotId) ? storedPilotId : null);
  const [username, setUsername] = useState(
    typeof window !== 'undefined' ? (localStorage.getItem('freqmap_user') || '') : ''
  );

  const [authMode, setAuthMode] = useState('login');
  const [authForm, setAuthForm] = useState({ username: '', password: '' });
  const [authError, setAuthError] = useState('');

  const [markers, setMarkers] = useState([]);
  const [drones, setDrones] = useState([]);
  const [selectedDroneId, setSelectedDroneId] = useState('');
  const [flightDuration, setFlightDuration] = useState(2);

  const [mapCenter, setMapCenter] = useState([50.0647, 19.9450]);
  const [mapZoom, setMapZoom] = useState(12);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const searchTimeoutRef = useRef(null);

  const [activeTab, setActiveTab] = useState('map');
  const [modalCoords, setModalCoords] = useState(null);
  const [showNewDroneForm, setShowNewDroneForm] = useState(false);
  const [newDrone, setNewDrone] = useState({ ...defaultNewDrone });

  // Demo mode: бэкенд недоступен
  const [demoMode, setDemoMode] = useState(false);

  // Profile sheet — открывается из попапа метки
  // { pilot: {id, username}, drones: DroneProfile[] } | null
  const [profileSheet, setProfileSheet] = useState(null);

  // Конфликты частот
  const conflictIds = useMemo(() => findConflictingMarkers(markers), [markers]);

  // Inject dark popup styles once
  useEffect(() => {
    if (document.getElementById('leaflet-dark-popup')) return;
    const style = document.createElement('style');
    style.id = 'leaflet-dark-popup';
    style.innerHTML = `
      .leaflet-popup-content-wrapper {
        background: #1e1c22; color: #e6e1e5; border-radius: 16px;
        padding: 4px; box-shadow: 0 8px 24px rgba(0,0,0,0.7);
        border: 1px solid #3a3740;
      }
      .leaflet-popup-tip { background: #1e1c22; }
      .leaflet-popup-close-button { color: #888 !important; top: 10px !important; right: 10px !important; }
    `;
    document.head.appendChild(style);
    return () => {
      const el = document.getElementById('leaflet-dark-popup');
      if (el) el.remove();
    };
  }, []);

  // ---------------------------------------------------------------------------
  // Demo mode helpers
  // ---------------------------------------------------------------------------
  const loadDemoData = useCallback((currentPilotId) => {
    const allMarkers = lsGet(LS_MARKERS, []);
    setMarkers(allMarkers);

    if (currentPilotId != null) {
      const allDrones = lsGet(LS_DRONES, []);
      const pilotDrones = allDrones.filter((d) => d.pilot_id === currentPilotId);
      setDrones(pilotDrones);
      if (pilotDrones.length > 0 && !selectedDroneId) {
        setSelectedDroneId(String(pilotDrones[0].id));
      }
    }
  }, []); // selectedDroneId intentionally excluded — init only

  // ---------------------------------------------------------------------------
  // Data loading
  // ---------------------------------------------------------------------------
  // FIX: useCallback чтобы не пересоздавать функцию при каждом рендере
  const loadData = useCallback(async (currentPilotId) => {
    if (demoMode) {
      loadDemoData(currentPilotId ?? pilotId);
      return;
    }
    try {
      const resM = await fetch(`${API_BASE}/markers`);
      if (resM.ok) {
        setMarkers(await resM.json());
      }
      if (currentPilotId != null) {
        const resD = await fetch(`${API_BASE}/pilots/${currentPilotId}/drones`);
        if (resD.ok) {
          const droneList = await resD.json();
          setDrones(droneList);
          if (droneList.length > 0 && !selectedDroneId) {
            setSelectedDroneId(String(droneList[0].id));
          }
        }
      }
    } catch {
      // Бэкенд недоступен — переключаемся в demo mode
      setDemoMode(true);
      loadDemoData(currentPilotId ?? pilotId);
    }
  }, [demoMode, pilotId, loadDemoData]); // FIX: корректные зависимости

  useEffect(() => {
    if (pilotId != null) {
      loadData(pilotId);
    }
    const interval = setInterval(() => loadData(pilotId), 15000);
    return () => clearInterval(interval);
  }, [pilotId]); // FIX: не тянем loadData в deps чтобы не ловить бесконечный цикл

  // ---------------------------------------------------------------------------
  // Auth
  // ---------------------------------------------------------------------------
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');

    // Demo mode auth
    if (demoMode) {
      const pilots = lsGet(LS_PILOTS, []);
      if (authMode === 'login') {
        const found = pilots.find(
          (p) => p.username === authForm.username && p.password === authForm.password
        );
        if (found) {
          localStorage.setItem('freqmap_pilot_id', String(found.id));
          localStorage.setItem('freqmap_user', found.username);
          setPilotId(found.id);
          setUsername(found.username);
        } else {
          setAuthError('Wrong callsign or password');
        }
      } else {
        if (pilots.find((p) => p.username === authForm.username)) {
          setAuthError('Callsign already taken');
          return;
        }
        const newPilot = { id: lsNextId(pilots), username: authForm.username, password: authForm.password };
        const updated = [...pilots, newPilot];
        lsSet(LS_PILOTS, updated);
        localStorage.setItem('freqmap_pilot_id', String(newPilot.id));
        localStorage.setItem('freqmap_user', newPilot.username);
        setPilotId(newPilot.id);
        setUsername(newPilot.username);
      }
      return;
    }

    // Real backend
    try {
      const endpoint = authMode === 'login' ? '/auth/login' : '/auth/register';
      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(authForm),
      });
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem('freqmap_pilot_id', String(data.id));
        localStorage.setItem('freqmap_user', data.username);
        setPilotId(data.id);
        setUsername(data.username);
      } else {
        const errData = await res.json().catch(() => ({}));
        setAuthError(errData.detail || 'Error');
      }
    } catch {
      // Бэкенд недоступен — переключаемся в demo mode
      setDemoMode(true);
      setAuthError('');
      // Повторяем через demo mode
      const pilots = lsGet(LS_PILOTS, []);
      if (authMode === 'login') {
        const found = pilots.find(
          (p) => p.username === authForm.username && p.password === authForm.password
        );
        if (found) {
          localStorage.setItem('freqmap_pilot_id', String(found.id));
          localStorage.setItem('freqmap_user', found.username);
          setPilotId(found.id);
          setUsername(found.username);
        } else if (pilots.length === 0) {
          // Первый запуск без бэкенда — создаём пилота автоматически
          const newPilot = { id: 1, username: authForm.username, password: authForm.password };
          lsSet(LS_PILOTS, [newPilot]);
          localStorage.setItem('freqmap_pilot_id', '1');
          localStorage.setItem('freqmap_user', newPilot.username);
          setPilotId(1);
          setUsername(newPilot.username);
        } else {
          setAuthError('Wrong callsign or password (demo mode)');
        }
      } else {
        const newPilot = { id: lsNextId(pilots), username: authForm.username, password: authForm.password };
        lsSet(LS_PILOTS, [...pilots, newPilot]);
        localStorage.setItem('freqmap_pilot_id', String(newPilot.id));
        localStorage.setItem('freqmap_user', newPilot.username);
        setPilotId(newPilot.id);
        setUsername(newPilot.username);
      }
    }
  };

  // ---------------------------------------------------------------------------
  // Profile sheet helpers
  // ---------------------------------------------------------------------------
  const openPilotProfile = useCallback(async (marker) => {
    const pilot = { id: marker.pilot_id, username: marker.pilot_username };

    // Если это наш маркер — дроны уже в state
    if (marker.pilot_id === pilotId) {
      setProfileSheet({ pilot, drones });
      return;
    }

    // Чужой пилот — пробуем загрузить дроны
    if (demoMode) {
      const allDrones = lsGet(LS_DRONES, []);
      const pilotDrones = allDrones.filter((d) => d.pilot_id === marker.pilot_id);
      setProfileSheet({ pilot, drones: pilotDrones });
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/pilots/${marker.pilot_id}/drones`);
      const pilotDrones = res.ok ? await res.json() : [];
      setProfileSheet({ pilot, drones: pilotDrones });
    } catch {
      // При ошибке — просто открываем с пустым ангаром
      setProfileSheet({ pilot, drones: [] });
    }
  }, [pilotId, drones, demoMode]);

  const handleSheetDeleteDrone = useCallback(async (droneId) => {
    if (demoMode) {
      const allDrones = lsGet(LS_DRONES, []);
      const updated = allDrones.filter((d) => d.id !== droneId);
      lsSet(LS_DRONES, updated);
      const myDrones = updated.filter((d) => d.pilot_id === pilotId);
      setDrones(myDrones);
      setProfileSheet((prev) =>
        prev ? { ...prev, drones: prev.drones.filter((d) => d.id !== droneId) } : null
      );
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/pilots/${pilotId}/drones/${droneId}`, { method: 'DELETE' });
      if (res.ok) {
        await loadData(pilotId);
        setProfileSheet((prev) =>
          prev ? { ...prev, drones: prev.drones.filter((d) => d.id !== droneId) } : null
        );
      }
    } catch (err) {
      console.error('[FreqMap] sheetDeleteDrone error:', err);
    }
  }, [demoMode, pilotId, loadData]);

  const handleSheetUpdateDrone = useCallback(async (droneId, patch) => {
    if (demoMode) {
      const allDrones = lsGet(LS_DRONES, []);
      const updated = allDrones.map((d) => d.id === droneId ? { ...d, ...patch } : d);
      lsSet(LS_DRONES, updated);
      const myDrones = updated.filter((d) => d.pilot_id === pilotId);
      setDrones(myDrones);
      setProfileSheet((prev) =>
        prev
          ? { ...prev, drones: prev.drones.map((d) => d.id === droneId ? { ...d, ...patch } : d) }
          : null
      );
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/pilots/${pilotId}/drones/${droneId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      if (res.ok) {
        await loadData(pilotId);
        setProfileSheet((prev) =>
          prev
            ? { ...prev, drones: prev.drones.map((d) => d.id === droneId ? { ...d, ...patch } : d) }
            : null
        );
      }
    } catch (err) {
      console.error('[FreqMap] sheetUpdateDrone error:', err);
    }
  }, [demoMode, pilotId, loadData]);

  // ---------------------------------------------------------------------------
  // Markers
  // ---------------------------------------------------------------------------
  const handleDeleteMarker = async (markerId) => {
    if (demoMode) {
      const updated = lsGet(LS_MARKERS, []).filter((m) => m.id !== markerId);
      lsSet(LS_MARKERS, updated);
      setMarkers(updated);
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/markers/${markerId}?pilot_id=${pilotId}`, { method: 'DELETE' });
      if (res.ok) loadData(pilotId);
    } catch (err) {
      console.error('[FreqMap] deleteMarker error:', err);
    }
  };

  const handlePlaceMarker = async () => {
    if (!selectedDroneId || !modalCoords) return;

    if (demoMode) {
      const droneIdNum = Number(selectedDroneId);
      const allDrones = lsGet(LS_DRONES, []);
      const drone = allDrones.find((d) => d.id === droneIdNum);
      const allMarkers = lsGet(LS_MARKERS, []);
      const newMarker = {
        id: lsNextId(allMarkers),
        pilot_id: pilotId,
        pilot_username: username,
        drone_id: droneIdNum,
        drone: drone || null,
        coordinates: { lat: modalCoords.lat, lng: modalCoords.lng },
        duration_hours: Number(flightDuration),
      };
      const updated = [...allMarkers, newMarker];
      lsSet(LS_MARKERS, updated);
      setMarkers(updated);
      setModalCoords(null);
      setActiveTab('map');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/markers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pilot_id: pilotId,
          drone_id: Number(selectedDroneId),
          coordinates: { lat: modalCoords.lat, lng: modalCoords.lng },
          duration_hours: Number(flightDuration),
        }),
      });
      if (res.ok) {
        setModalCoords(null);
        setActiveTab('map');
        loadData(pilotId);
      }
    } catch (err) {
      console.error('[FreqMap] placeMarker error:', err);
    }
  };

  // ---------------------------------------------------------------------------
  // Drones
  // ---------------------------------------------------------------------------
  const handleFreqChange = (freqValue) => {
    setNewDrone((prev) => ({
      ...prev,
      videoType: freqValue.videoType,
      band: freqValue.band,
      channel: freqValue.channel,
      frequency_mhz: freqValue.frequency_mhz,
      video_system: freqValue.videoType === 'analog'
        ? `Analog / ${freqValue.band}`
        : freqValue.band,
    }));
  };

  const handleAddDrone = async (e) => {
    e.preventDefault();
    const payload = {
      pilot_id: pilotId,
      name: newDrone.name,
      video_system: newDrone.video_system,
      frequency_mhz: newDrone.frequency_mhz,
      power_mw: parseInt(newDrone.power_mw, 10) || 200,
      drone_size: newDrone.drone_size || '5 inch',
      weight_g: newDrone.weight_g ? parseInt(newDrone.weight_g, 10) : null,
      band: newDrone.band,
      channel: newDrone.channel,
    };

    if (demoMode) {
      const allDrones = lsGet(LS_DRONES, []);
      const drone = { id: lsNextId(allDrones), ...payload };
      const updated = [...allDrones, drone];
      lsSet(LS_DRONES, updated);
      const pilotDrones = updated.filter((d) => d.pilot_id === pilotId);
      setDrones(pilotDrones);
      if (!selectedDroneId) setSelectedDroneId(String(drone.id));
      setShowNewDroneForm(false);
      setNewDrone({ ...defaultNewDrone });
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/pilots/${pilotId}/drones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setShowNewDroneForm(false);
        setNewDrone({ ...defaultNewDrone });
        await loadData(pilotId);
      }
    } catch (err) {
      console.error('[FreqMap] addDrone error:', err);
    }
  };

  // ---------------------------------------------------------------------------
  // Search
  // ---------------------------------------------------------------------------
  const handleSearchInput = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    // FIX: очищаем предыдущий timeout
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (query.length < 3) { setSearchResults([]); return; }
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&limit=5&q=${encodeURIComponent(query)}`
        );
        if (res.ok) setSearchResults(await res.json());
      } catch { /* ignore network errors */ }
    }, 400);
  };

  // FIX: cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, []);

  const locateMe = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (p) => { setMapCenter([p.coords.latitude, p.coords.longitude]); setMapZoom(15); },
        (err) => console.error('[FreqMap] geo error:', err.message)
      );
    }
  };

  const switchLang = (l) => {
    setLang(l);
    localStorage.setItem('freq_lang', l);
  };

  // ---------------------------------------------------------------------------
  // Auth screen
  // ---------------------------------------------------------------------------
  if (pilotId == null) {
    return (
      <div className="auth-screen">
        <div className="auth-card">
          <h1 className="auth-title">FreqMap Elite</h1>
          <p className="auth-subtitle">FPV Frequency Map</p>

          {demoMode && (
            <div className="demo-banner">
              <AlertTriangle size={14} />
              <span>{t.backend_offline}</span>
            </div>
          )}

          <div className="tab-toggle">
            <button
              className={`tab-btn ${authMode === 'login' ? 'active' : ''}`}
              onClick={() => { setAuthMode('login'); setAuthError(''); }}
            >
              {t.login}
            </button>
            <button
              className={`tab-btn ${authMode === 'register' ? 'active' : ''}`}
              onClick={() => { setAuthMode('register'); setAuthError(''); }}
            >
              {t.register}
            </button>
          </div>

          {authError && <p className="auth-error">{authError}</p>}

          <form onSubmit={handleAuthSubmit} className="auth-form">
            <input
              type="text"
              placeholder={t.nick}
              value={authForm.username}
              onChange={(e) => setAuthForm((p) => ({ ...p, username: e.target.value }))}
              required
              className="field-input"
              autoComplete="username"
            />
            <input
              type="password"
              placeholder={t.pass}
              value={authForm.password}
              onChange={(e) => setAuthForm((p) => ({ ...p, password: e.target.value }))}
              required
              className="field-input"
              autoComplete={authMode === 'login' ? 'current-password' : 'new-password'}
            />
            <button type="submit" className="btn-primary">
              {authMode === 'login' ? t.login : t.register}
            </button>
          </form>

          <div className="lang-row">
            {['ru', 'en', 'pl'].map((l) => (
              <button
                key={l}
                onClick={() => switchLang(l)}
                className={`lang-btn ${lang === l ? 'active' : ''}`}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Main app
  // ---------------------------------------------------------------------------
  return (
    <div className="app-root">
      {/* Demo mode banner */}
      {demoMode && (
        <div className="demo-mode-bar">
          <AlertTriangle size={13} />
          {t.demo_mode}
        </div>
      )}

      {/* MAP VIEW — always mounted to keep map state */}
      <div className={`map-wrapper ${activeTab !== 'map' ? 'map-wrapper--hidden' : ''}`}>

        {/* Search bar */}
        <div className="search-container">
          <input
            type="text"
            placeholder={t.search}
            value={searchQuery}
            onChange={handleSearchInput}
            className="search-input"
          />
          {searchResults.length > 0 && (
            <div className="search-dropdown">
              {searchResults.map((res, idx) => (
                <div
                  key={idx}
                  className="search-item"
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    setMapCenter([parseFloat(res.lat), parseFloat(res.lon)]);
                    setMapZoom(14);
                    setSearchQuery('');
                    setSearchResults([]);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      setMapCenter([parseFloat(res.lat), parseFloat(res.lon)]);
                      setMapZoom(14);
                      setSearchQuery('');
                      setSearchResults([]);
                    }
                  }}
                >
                  {res.display_name}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Conflict alert overlay */}
        {conflictIds.size > 0 && (
          <div className="conflict-overlay">
            <ConflictAlert markers={markers} conflictIds={conflictIds} />
          </div>
        )}

        <MapContainer
          center={mapCenter}
          zoom={mapZoom}
          style={{ height: '100%', width: '100%', zIndex: 1 }}
          zoomControl={false}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />
          <MapController center={mapCenter} zoom={mapZoom} />
          <MapEvents
            onMapClick={(latlng) => {
              setModalCoords(latlng);
              setActiveTab('add_marker');
            }}
          />

          {markers.map((m) => {
            const isConflict = conflictIds.has(m.id);
            return (
              <Marker
                key={m.id}
                position={[m.coordinates.lat, m.coordinates.lng]}
                icon={isConflict ? ConflictIcon : DefaultIcon}
              >
                <Popup>
                  <div className="popup-content">
                    <div className="popup-header">
                      <span className="popup-pilot">{m.pilot_username}</span>
                      {isConflict && (
                        <span className="popup-conflict-badge">
                          <AlertTriangle size={12} /> CONFLICT
                        </span>
                      )}
                    </div>
                    <div className="popup-rows">
                      <div className="popup-row">
                        <span className="popup-row-label">Drone</span>
                        <span>{m.drone?.name} {m.drone?.drone_size ? `(${m.drone.drone_size})` : ''}</span>
                      </div>
                      <div className="popup-row">
                        <span className="popup-row-label">System</span>
                        <span>{m.drone?.video_system || '—'}</span>
                      </div>
                      <div className={`popup-row popup-freq ${isConflict ? 'popup-freq--conflict' : ''}`}>
                        <span className="popup-row-label">Freq</span>
                        <span>{m.drone?.frequency_mhz ? `${m.drone.frequency_mhz} MHz` : '—'}</span>
                      </div>
                      {m.drone?.band && (
                        <div className="popup-row">
                          <span className="popup-row-label">Band / CH</span>
                          <span>{m.drone.band} / CH{m.drone.channel}</span>
                        </div>
                      )}
                      <div className="popup-row">
                        <span className="popup-row-label">Power</span>
                        <span>{m.drone?.power_mw ? `${m.drone.power_mw} mW` : '—'}</span>
                      </div>
                    </div>
                    <div className="popup-footer">
                      <button
                        className="btn-popup-profile"
                        onClick={() => openPilotProfile(m)}
                      >
                        <ExternalLink size={12} /> View Profile
                      </button>
                      {m.pilot_id === pilotId && (
                        <button
                          onClick={() => handleDeleteMarker(m.id)}
                          className="btn-danger popup-delete"
                        >
                          <Trash2 size={13} /> {t.remove}
                        </button>
                      )}
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>

      {/* PROFILE TAB */}
      {activeTab === 'profile' && (
        <div className="fullscreen-tab">
          <div className="tab-header">
            <div>
              <h2 className="tab-title">{username}</h2>
              <p className="tab-subtitle">Pilot #{pilotId}</p>
            </div>
            <button onClick={() => setActiveTab('map')} className="btn-icon" aria-label="Close">
              <X size={20} />
            </button>
          </div>

          <div className="section">
            <h3 className="section-title">{t.my_hangar}</h3>
            {drones.length === 0 && (
              <p className="empty-text">{t.no_drones}</p>
            )}
            <div className="drone-list">
              {drones.map((d) => (
                <DroneCard key={d.id} drone={d} />
              ))}
            </div>

            <button
              onClick={() => setShowNewDroneForm((v) => !v)}
              className="btn-secondary"
            >
              <Plus size={16} /> {t.add_drone}
            </button>

            {showNewDroneForm && (
              <form onSubmit={handleAddDrone} className="drone-form">
                <input
                  type="text"
                  placeholder={t.drone_name}
                  value={newDrone.name}
                  onChange={(e) => setNewDrone((p) => ({ ...p, name: e.target.value }))}
                  required
                  className="field-input"
                />

                <FrequencySelector
                  value={{
                    videoType: newDrone.videoType,
                    band: newDrone.band,
                    channel: newDrone.channel,
                    frequency_mhz: newDrone.frequency_mhz,
                  }}
                  onChange={handleFreqChange}
                />

                <div className="form-row">
                  <div className="form-field">
                    <label className="field-label">{t.power_mw}</label>
                    <input
                      type="number"
                      placeholder="200"
                      value={newDrone.power_mw}
                      onChange={(e) => setNewDrone((p) => ({ ...p, power_mw: e.target.value }))}
                      className="field-input"
                      min={25}
                      max={2000}
                    />
                  </div>
                  <div className="form-field">
                    <label className="field-label">{t.size}</label>
                    <select
                      value={newDrone.drone_size}
                      onChange={(e) => setNewDrone((p) => ({ ...p, drone_size: e.target.value }))}
                      className="field-input"
                    >
                      {['Micro (< 3")', '3 inch', '3.5 inch', '4 inch', '5 inch', '6 inch', '7 inch', '10 inch', 'Fixed Wing'].map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-field">
                    <label className="field-label">{t.weight} g</label>
                    <input
                      type="number"
                      placeholder="250"
                      value={newDrone.weight_g || ''}
                      onChange={(e) => setNewDrone((p) => ({ ...p, weight_g: e.target.value || null }))}
                      className="field-input"
                      min={1}
                    />
                  </div>
                </div>

                <div className="form-actions">
                  <button
                    type="button"
                    onClick={() => setShowNewDroneForm(false)}
                    className="btn-secondary"
                  >
                    {t.cancel}
                  </button>
                  <button type="submit" className="btn-primary">
                    {t.confirm}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* SETTINGS TAB */}
      {activeTab === 'settings' && (
        <div className="fullscreen-tab">
          <div className="tab-header">
            <h2 className="tab-title">
              {t.settings}
              {demoMode && <span className="demo-tag">demo</span>}
            </h2>
            <button onClick={() => setActiveTab('map')} className="btn-icon" aria-label="Close">
              <X size={20} />
            </button>
          </div>

          <div className="section">
            <h3 className="section-title">Language</h3>
            <div className="lang-row lang-row--large">
              {['ru', 'en', 'pl'].map((l) => (
                <button
                  key={l}
                  onClick={() => switchLang(l)}
                  className={`lang-btn lang-btn--large ${lang === l ? 'active' : ''}`}
                >
                  {l.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div className="section">
            <h3 className="section-title">{t.conflicts}</h3>
            {conflictIds.size === 0 ? (
              <p className="no-conflicts">
                <Radio size={14} /> {t.no_conflicts}
              </p>
            ) : (
              <ConflictAlert markers={markers} conflictIds={conflictIds} />
            )}
          </div>

          <div className="section">
            <button
              onClick={() => {
                localStorage.removeItem('freqmap_pilot_id');
                localStorage.removeItem('freqmap_user');
                setPilotId(null);
                setUsername('');
                setDrones([]);
                setMarkers([]);
                setSelectedDroneId('');
                setActiveTab('map');
              }}
              className="btn-danger"
            >
              {t.logout}
            </button>
          </div>
        </div>
      )}

      {/* ADD MARKER MODAL */}
      {activeTab === 'add_marker' && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-card">
            <h3 className="modal-title">{t.put_marker}</h3>
            {modalCoords && (
              <p className="modal-coords">
                {modalCoords.lat.toFixed(5)}, {modalCoords.lng.toFixed(5)}
              </p>
            )}

            {drones.length === 0 ? (
              <p className="empty-text">{t.no_drones}</p>
            ) : (
              <>
                <div className="form-field">
                  <label className="field-label">Drone</label>
                  <select
                    value={selectedDroneId}
                    onChange={(e) => setSelectedDroneId(e.target.value)}
                    className="field-input"
                  >
                    {drones.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} — {d.frequency_mhz} MHz
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-field">
                  <label className="field-label">{t.flight_time}</label>
                  <select
                    value={flightDuration}
                    onChange={(e) => setFlightDuration(e.target.value)}
                    className="field-input"
                  >
                    {[1, 2, 3, 5, 12, 24].map((h) => (
                      <option key={h} value={h}>{h} {t.hours}</option>
                    ))}
                  </select>
                </div>
              </>
            )}

            <div className="form-actions">
              <button
                onClick={() => { setModalCoords(null); setActiveTab('map'); }}
                className="btn-secondary"
              >
                {t.cancel}
              </button>
              <button
                onClick={handlePlaceMarker}
                className="btn-primary"
                disabled={!selectedDroneId || drones.length === 0}
              >
                {t.confirm}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PILOT PROFILE SHEET */}
      {profileSheet && (
        <PilotProfileSheet
          pilot={profileSheet.pilot}
          drones={profileSheet.drones}
          isOwner={profileSheet.pilot.id === pilotId}
          conflictIds={conflictIds}
          lang={lang}
          onClose={() => setProfileSheet(null)}
          onDeleteDrone={handleSheetDeleteDrone}
          onUpdateDrone={handleSheetUpdateDrone}
        />
      )}

      {/* BOTTOM NAV */}
      <nav className="bottom-nav" aria-label="Main navigation">
        <div className="bottom-nav__inner">
          <NavItem icon={MapIcon} label={t.map} active={activeTab === 'map'} onClick={() => setActiveTab('map')} />
          <NavItem icon={User} label={t.profile} active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} />

          <div className="fab-wrapper">
            <button onClick={locateMe} className="fab-btn" aria-label="My location">
              <Crosshair size={24} color="#1d1b20" />
            </button>
          </div>

          <NavItem
            icon={Settings}
            label={t.settings}
            active={activeTab === 'settings'}
            onClick={() => setActiveTab('settings')}
            badge={conflictIds.size > 0 ? conflictIds.size : null}
          />
          <NavItem
            icon={Globe}
            label={lang.toUpperCase()}
            active={false}
            onClick={() => switchLang(lang === 'ru' ? 'en' : lang === 'en' ? 'pl' : 'ru')}
          />
        </div>
      </nav>
    </div>
  );
}

// ---------------------------------------------------------------------------
// NavItem
// ---------------------------------------------------------------------------
function NavItem({ icon: Icon, label, active, onClick, badge }) {
  return (
    <button
      onClick={onClick}
      className={`nav-item ${active ? 'nav-item--active' : ''}`}
      aria-current={active ? 'page' : undefined}
    >
      <span className="nav-item__icon-wrap">
        <Icon size={22} />
        {badge != null && badge > 0 && (
          <span className="nav-badge">{badge}</span>
        )}
      </span>
      <span className="nav-item__label">{label}</span>
    </button>
  );
}

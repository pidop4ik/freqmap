import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Map as MapIcon, User, Settings, Crosshair, Globe, Trash2, Plus, AlertTriangle, Radio, X, ExternalLink, Maximize2, Zap, Weight, Pencil, ChevronDown, ChevronUp, Cpu, Info, Save } from 'lucide-react';

import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
import FrequencySelector from './components/FrequencySelector.jsx';
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
    nick: 'Позывной', pass: 'Пароль', my_hangar: 'Мой ангар',
    add_drone: 'Добавить дрон', logout: 'Выйти',
    hours: 'ч', flight_time: 'Время полёта', frequency: 'Частота',
    power: 'Мощность', cancel: 'Отмена', confirm: 'OK',
    no_drones: 'Дронов нет. Добавьте дрон здесь.',
    drone_name: 'Название дрона', size: 'Размер', weight: 'Вес (г)',
    power_mw: 'Мощность (mW)', conflicts: 'Конфликты частот',
    no_conflicts: 'Конфликтов нет', put_marker: 'Поставить метку',
    remove: 'Удалить', demo_mode: 'Демо-режим (бэкенд недоступен)',
    backend_offline: 'Бэкенд не запущен. Приложение работает в режиме демо.',
    step_basic: 'Шаг 1 — Основное',
    step_specs: 'Шаг 2 — Характеристики (по желанию)',
    skip_specs: 'Пропустить',
    next: 'Далее',
    save_drone: 'Сохранить дрон',
    view_profile: 'Профиль пилота',
    language: 'Язык',
    drone: 'Дрон',
    reset_accounts: 'Reset all accounts',
    reset_accounts_confirm: 'Click again to confirm',
    reset_accounts_desc: 'Deletes all pilots, drones and markers. Next pilot will get ID #1.',
    reset_accounts_done: 'All data cleared.',
    accounts_section: 'Data management',
  },
  en: {
    search: 'Search location...', map: 'Map', profile: 'Profile',
    settings: 'Settings', login: 'Login', register: 'Register',
    nick: 'Callsign', pass: 'Password', my_hangar: 'My Hangar',
    add_drone: 'Add Drone', logout: 'Logout',
    hours: 'h', flight_time: 'Flight Time', frequency: 'Frequency',
    power: 'Power', cancel: 'Cancel', confirm: 'OK',
    no_drones: 'No drones. Add one below.',
    drone_name: 'Drone Name', size: 'Size', weight: 'Weight (g)',
    power_mw: 'Power (mW)', conflicts: 'Frequency Conflicts',
    no_conflicts: 'No conflicts', put_marker: 'Place Marker',
    remove: 'Remove', demo_mode: 'Demo Mode (backend offline)',
    backend_offline: 'Backend not running. App works in demo mode.',
    step_basic: 'Step 1 — Basic Info',
    step_specs: 'Step 2 — Specs (optional)',
    skip_specs: 'Skip',
    next: 'Next',
    save_drone: 'Save Drone',
    view_profile: 'Pilot Profile',
    language: 'Language',
    drone: 'Drone',
    reset_accounts: 'Reset all accounts',
    reset_accounts_confirm: 'Click again to confirm',
    reset_accounts_desc: 'Deletes all pilots, drones and markers. Next pilot gets ID #1.',
    reset_accounts_done: 'All data cleared.',
    accounts_section: 'Data management',
  },
  pl: {
    search: 'Szukaj lokalizacji...', map: 'Mapa', profile: 'Profil',
    settings: 'Ustawienia', login: 'Zaloguj', register: 'Zarejestruj',
    nick: 'Nick', pass: 'Hasło', my_hangar: 'Mój Hangar',
    add_drone: 'Dodaj drona', logout: 'Wyloguj',
    hours: 'h', flight_time: 'Czas lotu', frequency: 'Częstotliwość',
    power: 'Moc', cancel: 'Anuluj', confirm: 'OK',
    no_drones: 'Brak dronów. Dodaj poniżej.',
    drone_name: 'Nazwa drona', size: 'Rozmiar', weight: 'Waga (g)',
    power_mw: 'Moc (mW)', conflicts: 'Konflikty częstotliwości',
    no_conflicts: 'Brak konfliktów', put_marker: 'Postaw znacznik',
    remove: 'Usuń', demo_mode: 'Tryb demo (backend offline)',
    backend_offline: 'Backend nie działa. Aplikacja w trybie demo.',
    step_basic: 'Krok 1 — Podstawowe',
    step_specs: 'Krok 2 — Specyfikacja (opcjonalnie)',
    skip_specs: 'Pomiń',
    next: 'Dalej',
    save_drone: 'Zapisz drona',
    view_profile: 'Profil pilota',
    language: 'Język',
    drone: 'Dron',
    reset_accounts: 'Resetuj wszystkie konta',
    reset_accounts_confirm: 'Kliknij ponownie aby potwierdzić',
    reset_accounts_desc: 'Usuwa wszystkich pilotów, drony i znaczniki. Następny pilot dostanie ID #1.',
    reset_accounts_done: 'Dane wyczyszczone.',
    accounts_section: 'Zarządzanie danymi',
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
  // specs (step 2)
  fc: '', esc: '', motor: '', props: '',
  camera: '', vtx: '', rx: '', battery: '', notes: '',
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
  // 1 = basic info, 2 = specs (optional)
  const [addDroneStep, setAddDroneStep] = useState(1);
  const [newDrone, setNewDrone] = useState({ ...defaultNewDrone });

  // Demo mode: бэкенд недоступен
  const [demoMode, setDemoMode] = useState(false);

  // Reset all accounts: double-confirm
  const [resetConfirm, setResetConfirm] = useState(false);
  const resetConfirmTimerRef = useRef(null);

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
    if (e && e.preventDefault) e.preventDefault();
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
      // specs
      fc: newDrone.fc || null,
      esc: newDrone.esc || null,
      motor: newDrone.motor || null,
      props: newDrone.props || null,
      camera: newDrone.camera || null,
      vtx: newDrone.vtx || null,
      rx: newDrone.rx || null,
      battery: newDrone.battery || null,
      notes: newDrone.notes || null,
    };

    const resetForm = () => {
      setShowNewDroneForm(false);
      setAddDroneStep(1);
      setNewDrone({ ...defaultNewDrone });
    };

    if (demoMode) {
      const allDrones = lsGet(LS_DRONES, []);
      const drone = { id: lsNextId(allDrones), ...payload };
      const updated = [...allDrones, drone];
      lsSet(LS_DRONES, updated);
      const pilotDrones = updated.filter((d) => d.pilot_id === pilotId);
      setDrones(pilotDrones);
      if (!selectedDroneId) setSelectedDroneId(String(drone.id));
      resetForm();
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/pilots/${pilotId}/drones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        resetForm();
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
          <h1 className="auth-title">FreqMap</h1>
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

          {/* Inline add-drone form */}
          {showNewDroneForm ? (
            <div className="section">
              {/* Step indicator */}
              <div className="add-drone-steps">
                <span className={`add-drone-step${addDroneStep === 1 ? ' add-drone-step--active' : ' add-drone-step--done'}`}>1</span>
                <div className="add-drone-step-line" />
                <span className={`add-drone-step${addDroneStep === 2 ? ' add-drone-step--active' : ''}`}>2</span>
              </div>
              <h3 className="section-title">
                {addDroneStep === 1 ? t.step_basic : t.step_specs}
              </h3>

              {addDroneStep === 1 && (
                <div className="drone-form">
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
                        {['Micro (< 3")', '3 inch', '3.5 inch', '4 inch', '5 inch', '6 inch', '7 inch', '10 inch', 'Fixed Wing'].map((sz) => (
                          <option key={sz} value={sz}>{sz}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-field">
                      <label className="field-label">{t.weight}</label>
                      <input
                        type="number"
                        placeholder="250"
                        value={newDrone.weight_g || ''}
                        onChange={(e) => setNewDrone((p) => ({ ...p, weight_g: e.target.value || null }))}
                        className="field-input"
                        min={1}
                      />
                    </div>
                    <div className="form-field">
                      <label className="field-label">{t.battery || 'Battery'}</label>
                      <input
                        type="text"
                        placeholder="4S 1500mAh"
                        value={newDrone.battery}
                        onChange={(e) => setNewDrone((p) => ({ ...p, battery: e.target.value }))}
                        className="field-input"
                      />
                    </div>
                  </div>
                  <div className="form-actions">
                    <button
                      type="button"
                      onClick={() => { setShowNewDroneForm(false); setAddDroneStep(1); setNewDrone({ ...defaultNewDrone }); }}
                      className="btn-secondary"
                    >
                      {t.cancel}
                    </button>
                    <button
                      type="button"
                      onClick={() => { if (newDrone.name.trim()) setAddDroneStep(2); }}
                      className="btn-primary"
                      disabled={!newDrone.name.trim()}
                    >
                      {t.next}
                    </button>
                  </div>
                </div>
              )}

              {addDroneStep === 2 && (
                <div className="drone-form">
                  {[
                    { key: 'fc',     label: 'FC',     ph: 'SpeedyBee F405' },
                    { key: 'esc',    label: 'ESC',    ph: 'Mamba 45A' },
                    { key: 'motor',  label: 'Motor',  ph: 'T-Motor 2306 2450KV' },
                    { key: 'props',  label: 'Props',  ph: 'HQProp 5x4.5x3' },
                    { key: 'camera', label: 'Camera', ph: 'Foxeer Razer' },
                    { key: 'vtx',    label: 'VTX',    ph: 'Rush Tank Ultimate' },
                    { key: 'rx',     label: 'RX',     ph: 'ELRS 2.4G' },
                  ].map(({ key, label, ph }) => (
                    <div className="form-field" key={key}>
                      <label className="field-label">{label}</label>
                      <input
                        type="text"
                        placeholder={ph}
                        value={newDrone[key]}
                        onChange={(e) => setNewDrone((p) => ({ ...p, [key]: e.target.value }))}
                        className="field-input"
                      />
                    </div>
                  ))}
                  <div className="form-field">
                    <label className="field-label">Notes</label>
                    <textarea
                      className="field-input field-textarea"
                      placeholder="Any extra info..."
                      value={newDrone.notes}
                      onChange={(e) => setNewDrone((p) => ({ ...p, notes: e.target.value }))}
                      rows={3}
                    />
                  </div>
                  <div className="form-actions">
                    <button type="button" onClick={() => setAddDroneStep(1)} className="btn-secondary">
                      &larr; {t.cancel}
                    </button>
                    <button type="button" onClick={handleAddDrone} className="btn-ghost">
                      {t.skip_specs}
                    </button>
                    <button type="button" onClick={handleAddDrone} className="btn-primary">
                      {t.save_drone}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Hangar — uses PilotProfileSheet inline */
            <div className="section">
              <div className="section-header-row">
                <h3 className="section-title">{t.my_hangar}</h3>
                <button
                  onClick={() => { setShowNewDroneForm(true); setAddDroneStep(1); }}
                  className="btn-secondary btn-secondary--sm"
                >
                  <Plus size={15} /> {t.add_drone}
                </button>
              </div>

              {drones.length === 0 && (
                <p className="empty-text">{t.no_drones}</p>
              )}

              {/* Render drone cards inline — isOwner=true, always */}
              <ProfileDroneList
                drones={drones}
                isOwner
                conflictIds={conflictIds}
                lang={lang}
                onDeleteDrone={handleSheetDeleteDrone}
                onUpdateDrone={handleSheetUpdateDrone}
              />
            </div>
          )}
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

          <div className="section">
            <h3 className="section-title">{t.accounts_section}</h3>
            <p className="section-desc">{t.reset_accounts_desc}</p>
            <button
              className={`btn-danger${resetConfirm ? ' btn-danger--confirm' : ''}`}
              onClick={() => {
                if (!resetConfirm) {
                  setResetConfirm(true);
                  resetConfirmTimerRef.current = setTimeout(() => setResetConfirm(false), 4000);
                } else {
                  clearTimeout(resetConfirmTimerRef.current);
                  // Wipe everything
                  lsSet(LS_PILOTS, []);
                  lsSet(LS_DRONES, []);
                  lsSet(LS_MARKERS, []);
                  localStorage.removeItem('freqmap_pilot_id');
                  localStorage.removeItem('freqmap_user');
                  setPilotId(null);
                  setUsername('');
                  setDrones([]);
                  setMarkers([]);
                  setSelectedDroneId('');
                  setDemoMode(false);
                  setResetConfirm(false);
                  setActiveTab('map');
                }
              }}
            >
              {resetConfirm ? t.reset_accounts_confirm : t.reset_accounts}
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
// ---------------------------------------------------------------------------
// ProfileDroneList — встроенный список дронов для вкладки Profile
// Повторяет логику PilotProfileSheet, но без модального overlay
// ---------------------------------------------------------------------------
function ProfileDroneList({ drones, isOwner, conflictIds, lang, onDeleteDrone, onUpdateDrone }) {
  // lazy import строк прямо из SHEET_I18N через встроенный объект
  const S = {
    ru: { tab_info: 'Основное', tab_specs: 'Спеки', tab_edit: 'Редактировать', no_specs: 'Не заполнено.', delete_confirm: 'Удалить?', delete: 'Удалить', cancel: 'Отмена', save: 'Сохранить', edit: 'Редактировать', conflict: 'КОНФЛИКТ', name: 'Название', power: 'Мощность (mW)', size: 'Размер', weight: 'Вес (г)', fc: 'FC', esc: 'ESC', motor: 'Мотор', props: 'Пропы', camera: 'Камера', vtx: 'VTX', rx: 'RX', battery: 'Аккумулятор', notes: 'Заметки', freq_section: 'Частота', basic_section: 'Основные', specs_section: 'Характеристики (по желанию)', notes_placeholder: 'Дополнительная информация...' },
    en: { tab_info: 'Info', tab_specs: 'Specs', tab_edit: 'Edit', no_specs: 'No specs added.', delete_confirm: 'Delete drone?', delete: 'Delete', cancel: 'Cancel', save: 'Save', edit: 'Edit', conflict: 'CONFLICT', name: 'Name', power: 'Power (mW)', size: 'Size', weight: 'Weight (g)', fc: 'FC', esc: 'ESC', motor: 'Motor', props: 'Props', camera: 'Camera', vtx: 'VTX', rx: 'RX', battery: 'Battery', notes: 'Notes', freq_section: 'Frequency', basic_section: 'Basic info', specs_section: 'Specs (optional)', notes_placeholder: 'Any extra info...' },
    pl: { tab_info: 'Info', tab_specs: 'Specyfikacja', tab_edit: 'Edytuj', no_specs: 'Brak specyfikacji.', delete_confirm: 'Usunąć drona?', delete: 'Usuń', cancel: 'Anuluj', save: 'Zapisz', edit: 'Edytuj', conflict: 'KONFLIKT', name: 'Nazwa', power: 'Moc (mW)', size: 'Rozmiar', weight: 'Waga (g)', fc: 'FC', esc: 'ESC', motor: 'Silnik', props: 'Śmigła', camera: 'Kamera', vtx: 'VTX', rx: 'Odbiornik', battery: 'Akumulator', notes: 'Notatki', freq_section: 'Częstotliwość', basic_section: 'Podstawowe', specs_section: 'Specyfikacja (opcjonalnie)', notes_placeholder: 'Dodatkowe informacje...' },
  };
  const s = S[lang] ?? S.en;
  const SIZES = ['Micro (< 3")', '3 inch', '3.5 inch', '4 inch', '5 inch', '6 inch', '7 inch', '10 inch', 'Fixed Wing'];

  const [expandedId, setExpandedId] = React.useState(null);
  const [activeTabs, setActiveTabs] = React.useState({});
  const [confirmDeleteId, setConfirmDeleteId] = React.useState(null);
  const [editForms, setEditForms] = React.useState({});

  const openCard = (drone) => {
    setExpandedId((prev) => prev === drone.id ? null : drone.id);
    setActiveTabs((p) => ({ ...p, [drone.id]: p[drone.id] ?? 'info' }));
  };

  const switchTab = (droneId, tab) => {
    setActiveTabs((p) => ({ ...p, [droneId]: tab }));
    if (tab === 'edit') {
      setEditForms((prev) => {
        if (prev[droneId]) return prev;
        const drone = drones.find((d) => d.id === droneId);
        if (!drone) return prev;
        return { ...prev, [droneId]: { name: drone.name || '', videoType: drone.videoType || 'analog', band: drone.band || 'R', channel: drone.channel || 1, frequency_mhz: drone.frequency_mhz || 5658, video_system: drone.video_system || '', power_mw: drone.power_mw || 200, drone_size: drone.drone_size || '5 inch', weight_g: drone.weight_g || '', motor: drone.motor || '', props: drone.props || '', battery: drone.battery || '', vtx: drone.vtx || '', camera: drone.camera || '', fc: drone.fc || '', esc: drone.esc || '', rx: drone.rx || '', notes: drone.notes || '' } };
      });
    }
  };

  const patchForm = (droneId, patch) => setEditForms((prev) => ({ ...prev, [droneId]: { ...prev[droneId], ...patch } }));

  const saveEdit = (droneId) => {
    const form = editForms[droneId];
    if (!form || !onUpdateDrone) return;
    onUpdateDrone(droneId, { name: form.name, videoType: form.videoType, band: form.band, channel: form.channel, frequency_mhz: form.frequency_mhz, video_system: form.videoType === 'analog' ? `Analog / ${form.band}` : form.video_system, power_mw: parseInt(form.power_mw, 10) || 200, drone_size: form.drone_size, weight_g: form.weight_g ? parseInt(form.weight_g, 10) : null, motor: form.motor, props: form.props, battery: form.battery, vtx: form.vtx, camera: form.camera, fc: form.fc, esc: form.esc, rx: form.rx, notes: form.notes });
    setActiveTabs((p) => ({ ...p, [droneId]: 'info' }));
    setEditForms((prev) => { const next = { ...prev }; delete next[droneId]; return next; });
  };

  if (drones.length === 0) return null;

  return (
    <div className="drone-list" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {drones.map((drone) => {
        const isConflict = conflictIds.has(drone.id);
        const isExpanded = expandedId === drone.id;
        const tab = activeTabs[drone.id] ?? 'info';
        const form = editForms[drone.id];

        return (
          <div key={drone.id} className={`profile-drone-card${isConflict ? ' profile-drone-card--conflict' : ''}`}>
            {/* Header */}
            <div className="profile-drone-card__top">
              <button className="profile-drone-card__toggle" onClick={() => openCard(drone)} aria-expanded={isExpanded}>
                <span className="profile-drone-card__name">{drone.name}</span>
                <span className="profile-drone-card__meta">
                  {isConflict && <span className="conflict-badge conflict-badge--sm"><AlertTriangle size={10} /> {s.conflict}</span>}
                  <span className="profile-drone-card__freq">{drone.frequency_mhz ? `${drone.frequency_mhz} MHz` : '—'}</span>
                  {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </span>
              </button>
              {isOwner && confirmDeleteId !== drone.id && (
                <div className="profile-drone-card__actions">
                  <button className="btn-icon btn-icon--sm" onClick={() => { if (!isExpanded) openCard(drone); switchTab(drone.id, 'edit'); }} title={s.edit}>
                    <Pencil size={14} />
                  </button>
                  <button className="btn-icon btn-icon--sm btn-icon--danger" onClick={() => setConfirmDeleteId(drone.id)} title={s.delete}>
                    <Trash2 size={14} />
                  </button>
                </div>
              )}
              {isOwner && confirmDeleteId === drone.id && (
                <div className="profile-drone-card__confirm-delete">
                  <span className="confirm-delete__label">{s.delete_confirm}</span>
                  <button className="btn-danger btn-danger--sm" onClick={() => { setConfirmDeleteId(null); onDeleteDrone && onDeleteDrone(drone.id); }}>{s.delete}</button>
                  <button className="btn-ghost btn-ghost--sm" onClick={() => setConfirmDeleteId(null)}>{s.cancel}</button>
                </div>
              )}
            </div>

            {/* Quick chips */}
            <div className="profile-drone-card__chips">
              <span className="info-chip"><Radio size={11} />{drone.video_system || '—'}</span>
              {drone.band && <span className="info-chip">{drone.band} / CH{drone.channel}</span>}
              {drone.drone_size && <span className="info-chip"><Maximize2 size={11} />{drone.drone_size}</span>}
              {drone.power_mw && <span className="info-chip"><Zap size={11} />{drone.power_mw} mW</span>}
              {drone.weight_g && <span className="info-chip"><Weight size={11} />{drone.weight_g} g</span>}
            </div>

            {/* Expanded tabs */}
            {isExpanded && (
              <div className="profile-drone-card__expanded">
                <div className="drone-tabs">
                  <button className={`drone-tab${tab === 'info' ? ' drone-tab--active' : ''}`} onClick={() => switchTab(drone.id, 'info')}><Info size={13} /> {s.tab_info}</button>
                  <button className={`drone-tab${tab === 'specs' ? ' drone-tab--active' : ''}`} onClick={() => switchTab(drone.id, 'specs')}><Cpu size={13} /> {s.tab_specs}</button>
                  {isOwner && <button className={`drone-tab${tab === 'edit' ? ' drone-tab--active' : ''}`} onClick={() => switchTab(drone.id, 'edit')}><Pencil size={13} /> {s.tab_edit}</button>}
                </div>
                <div className="drone-tab-content">
                  {tab === 'info' && (
                    <div className="specs-view">
                      {[{ label: s.power, value: drone.power_mw ? `${drone.power_mw} mW` : null }, { label: s.size, value: drone.drone_size || null }, { label: s.weight, value: drone.weight_g ? `${drone.weight_g} g` : null }, { label: s.battery, value: drone.battery || null }].filter((r) => r.value).length > 0 ? (
                        <div className="specs-grid">
                          {[{ label: s.power, value: drone.power_mw ? `${drone.power_mw} mW` : null }, { label: s.size, value: drone.drone_size || null }, { label: s.weight, value: drone.weight_g ? `${drone.weight_g} g` : null }, { label: s.battery, value: drone.battery || null }].filter((r) => r.value).map(({ label, value }) => (
                            <div key={label} className="specs-row"><span className="specs-label">{label}</span><span className="specs-value">{value}</span></div>
                          ))}
                        </div>
                      ) : <p className="empty-text" style={{ fontSize: '12px' }}>{s.no_specs}</p>}
                    </div>
                  )}
                  {tab === 'specs' && (
                    <div className="specs-view">
                      {[{ label: s.fc, value: drone.fc }, { label: s.esc, value: drone.esc }, { label: s.motor, value: drone.motor }, { label: s.props, value: drone.props }, { label: s.camera, value: drone.camera }, { label: s.vtx, value: drone.vtx }, { label: s.rx, value: drone.rx }].filter((r) => r.value).length === 0 && !drone.notes
                        ? <p className="empty-text" style={{ fontSize: '12px' }}>{s.no_specs}</p>
                        : <>
                            <div className="specs-grid">
                              {[{ label: s.fc, value: drone.fc }, { label: s.esc, value: drone.esc }, { label: s.motor, value: drone.motor }, { label: s.props, value: drone.props }, { label: s.camera, value: drone.camera }, { label: s.vtx, value: drone.vtx }, { label: s.rx, value: drone.rx }].filter((r) => r.value).map(({ label, value }) => (
                                <div key={label} className="specs-row"><span className="specs-label">{label}</span><span className="specs-value">{value}</span></div>
                              ))}
                            </div>
                            {drone.notes && <p className="specs-notes">{drone.notes}</p>}
                          </>
                      }
                    </div>
                  )}
                  {tab === 'edit' && isOwner && form && (
                    <div className="edit-form">
                      <div className="form-field"><label className="field-label">{s.name}</label><input className="field-input" value={form.name} onChange={(e) => patchForm(drone.id, { name: e.target.value })} /></div>
                      <p className="edit-form__section-label">{s.freq_section}</p>
                      <FrequencySelector value={{ videoType: form.videoType, band: form.band, channel: form.channel, frequency_mhz: form.frequency_mhz }} onChange={(v) => patchForm(drone.id, { videoType: v.videoType, band: v.band, channel: v.channel, frequency_mhz: v.frequency_mhz, video_system: v.videoType === 'analog' ? `Analog / ${v.band}` : form.video_system })} />
                      <p className="edit-form__section-label">{s.basic_section}</p>
                      <div className="form-row">
                        <div className="form-field"><label className="field-label">{s.power}</label><input type="number" className="field-input" value={form.power_mw} onChange={(e) => patchForm(drone.id, { power_mw: e.target.value })} min={25} max={2000} /></div>
                        <div className="form-field"><label className="field-label">{s.size}</label><select className="field-input" value={form.drone_size} onChange={(e) => patchForm(drone.id, { drone_size: e.target.value })}>{SIZES.map((sz) => <option key={sz} value={sz}>{sz}</option>)}</select></div>
                      </div>
                      <div className="form-row">
                        <div className="form-field"><label className="field-label">{s.weight}</label><input type="number" className="field-input" value={form.weight_g} onChange={(e) => patchForm(drone.id, { weight_g: e.target.value })} min={1} /></div>
                        <div className="form-field"><label className="field-label">{s.battery}</label><input type="text" className="field-input" value={form.battery} onChange={(e) => patchForm(drone.id, { battery: e.target.value })} /></div>
                      </div>
                      <p className="edit-form__section-label">{s.specs_section}</p>
                      {[['fc', s.fc, 'SpeedyBee F405'], ['esc', s.esc, 'Mamba 45A'], ['motor', s.motor, 'T-Motor 2306'], ['props', s.props, 'HQProp 5x4.5'], ['camera', s.camera, 'Foxeer Razer'], ['vtx', s.vtx, 'Rush Tank'], ['rx', s.rx, 'ELRS 2.4G']].map(([field, label, ph]) => (
                        <div className="form-field" key={field}><label className="field-label">{label}</label><input type="text" className="field-input" placeholder={ph} value={form[field] ?? ''} onChange={(e) => patchForm(drone.id, { [field]: e.target.value })} /></div>
                      ))}
                      <div className="form-field"><label className="field-label">{s.notes}</label><textarea className="field-input field-textarea" placeholder={s.notes_placeholder} value={form.notes} onChange={(e) => patchForm(drone.id, { notes: e.target.value })} rows={3} /></div>
                      <div className="edit-form__actions">
                        <button className="btn-primary" onClick={() => saveEdit(drone.id)}><Save size={14} /> {s.save}</button>
                        <button className="btn-ghost" onClick={() => switchTab(drone.id, 'info')}>{s.cancel}</button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

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

import React from 'react';
import { ANALOG_BANDS, DIGITAL_SYSTEMS, getFrequency } from '../data/frequencies';

/**
 * FrequencySelector — выбор видеосистемы, band/системы, канала.
 * После выбора автоматически вычисляет и отдаёт частоту наверх через onChange.
 *
 * Props:
 *   value: { videoType, band, channel, frequency_mhz }
 *   onChange: (newValue) => void
 */
export default function FrequencySelector({ value, onChange }) {
  const { videoType = 'analog', band = 'R', channel = 1 } = value || {};

  const bandOptions = videoType === 'analog' ? ANALOG_BANDS : DIGITAL_SYSTEMS;
  const currentBandData = bandOptions[band];
  const channelMap = currentBandData?.channels || {};

  // Каналы только те, у которых частота не null
  const availableChannels = Object.entries(channelMap)
    .filter(([, freq]) => freq !== null)
    .map(([ch, freq]) => ({ ch: parseInt(ch), freq }));

  const computedFreq = getFrequency(videoType, band, parseInt(channel));

  const handleVideoTypeChange = (newType) => {
    const newBandOptions = newType === 'analog' ? ANALOG_BANDS : DIGITAL_SYSTEMS;
    const firstBand = Object.keys(newBandOptions)[0];
    const firstBandChannels = newBandOptions[firstBand]?.channels || {};
    const firstCh = Object.entries(firstBandChannels).find(([, f]) => f !== null);
    const firstChannel = firstCh ? parseInt(firstCh[0]) : 1;
    const freq = getFrequency(newType, firstBand, firstChannel);
    onChange({ videoType: newType, band: firstBand, channel: firstChannel, frequency_mhz: freq });
  };

  const handleBandChange = (newBand) => {
    const bandChannels = bandOptions[newBand]?.channels || {};
    const firstCh = Object.entries(bandChannels).find(([, f]) => f !== null);
    const firstChannel = firstCh ? parseInt(firstCh[0]) : 1;
    const freq = getFrequency(videoType, newBand, firstChannel);
    onChange({ ...value, band: newBand, channel: firstChannel, frequency_mhz: freq });
  };

  const handleChannelChange = (newCh) => {
    const freq = getFrequency(videoType, band, parseInt(newCh));
    onChange({ ...value, channel: parseInt(newCh), frequency_mhz: freq });
  };

  return (
    <div className="freq-selector">
      {/* Тип видеосистемы */}
      <div className="freq-type-toggle">
        <button
          type="button"
          className={`toggle-btn ${videoType === 'analog' ? 'active' : ''}`}
          onClick={() => handleVideoTypeChange('analog')}
        >
          Analog
        </button>
        <button
          type="button"
          className={`toggle-btn ${videoType === 'digital' ? 'active' : ''}`}
          onClick={() => handleVideoTypeChange('digital')}
        >
          Digital
        </button>
      </div>

      {/* Band / Система */}
      <div className="freq-field">
        <label className="freq-label">
          {videoType === 'analog' ? 'Band' : 'System'}
        </label>
        <select
          value={band}
          onChange={(e) => handleBandChange(e.target.value)}
          className="freq-select"
        >
          {Object.entries(bandOptions).map(([key, data]) => (
            <option key={key} value={key}>
              {data.label}
            </option>
          ))}
        </select>
      </div>

      {/* Канал */}
      <div className="freq-field">
        <label className="freq-label">Channel</label>
        <select
          value={channel}
          onChange={(e) => handleChannelChange(e.target.value)}
          className="freq-select"
        >
          {availableChannels.map(({ ch, freq }) => (
            <option key={ch} value={ch}>
              CH{ch} — {freq} MHz
            </option>
          ))}
        </select>
      </div>

      {/* Итоговая частота */}
      <div className="freq-result">
        <span className="freq-result-label">Frequency</span>
        <span className="freq-result-value">
          {computedFreq ? `${computedFreq} MHz` : '—'}
        </span>
      </div>
    </div>
  );
}

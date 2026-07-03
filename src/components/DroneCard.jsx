import React from 'react';
import { Trash2, Radio, Zap, Maximize2 } from 'lucide-react';

/**
 * DroneCard — карточка дрона в ангаре.
 * Props:
 *   drone: DroneProfile object
 *   isConflict: boolean — подсветить как конфликтный
 *   onDelete?: () => void
 */
export default function DroneCard({ drone, isConflict = false, onDelete }) {
  return (
    <div className={`drone-card ${isConflict ? 'drone-card--conflict' : ''}`}>
      <div className="drone-card__header">
        <span className="drone-card__name">{drone.name}</span>
        {isConflict && (
          <span className="conflict-badge">CONFLICT</span>
        )}
        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            className="drone-card__delete"
            aria-label="Delete drone"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>
      <div className="drone-card__info">
        <span className="drone-info-item">
          <Radio size={12} />
          {drone.video_system}
        </span>
        <span className="drone-info-item">
          <Zap size={12} />
          {drone.frequency_mhz ? `${drone.frequency_mhz} MHz` : '—'}
        </span>
        {drone.power_mw && (
          <span className="drone-info-item">
            {drone.power_mw} mW
          </span>
        )}
        {drone.drone_size && (
          <span className="drone-info-item">
            <Maximize2 size={12} />
            {drone.drone_size}
          </span>
        )}
        {drone.band && (
          <span className="drone-info-item drone-info-item--muted">
            {drone.band} / CH{drone.channel}
          </span>
        )}
      </div>
    </div>
  );
}

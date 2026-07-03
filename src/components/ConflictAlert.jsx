import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { CONFLICT_THRESHOLD_MHZ } from '../data/frequencies';

/**
 * ConflictAlert — показывает список конфликтующих пар пилотов.
 * Props:
 *   markers: MarkerResponse[]
 *   conflictIds: Set<string>
 */
export default function ConflictAlert({ markers, conflictIds }) {
  if (!conflictIds || conflictIds.size === 0) return null;

  // Собираем пары
  const conflictPairs = [];
  const seen = new Set();

  for (let i = 0; i < markers.length; i++) {
    for (let j = i + 1; j < markers.length; j++) {
      const a = markers[i];
      const b = markers[j];
      const freqA = a.drone?.frequency_mhz;
      const freqB = b.drone?.frequency_mhz;
      if (!freqA || !freqB) continue;

      const diff = Math.abs(freqA - freqB);
      if (diff < CONFLICT_THRESHOLD_MHZ) {
        const pairKey = [a.id, b.id].sort().join('_');
        if (!seen.has(pairKey)) {
          seen.add(pairKey);
          conflictPairs.push({ a, b, diff });
        }
      }
    }
  }

  if (conflictPairs.length === 0) return null;

  return (
    <div className="conflict-alert">
      <div className="conflict-alert__header">
        <AlertTriangle size={16} />
        <span>Frequency conflicts detected ({conflictPairs.length})</span>
      </div>
      <ul className="conflict-alert__list">
        {conflictPairs.map(({ a, b, diff }, idx) => (
          <li key={idx} className="conflict-alert__item">
            <span className="conflict-pilot">{a.pilot_username}</span>
            <span className="conflict-freq">{a.drone?.frequency_mhz} MHz</span>
            <span className="conflict-sep">vs</span>
            <span className="conflict-pilot">{b.pilot_username}</span>
            <span className="conflict-freq">{b.drone?.frequency_mhz} MHz</span>
            <span className="conflict-diff">({diff} MHz apart)</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

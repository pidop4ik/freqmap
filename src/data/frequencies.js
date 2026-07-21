// ============================================================
// Полные частотные сетки для FPV видеопередатчиков
// Источник: стандартные таблицы FPV сообщества
// ============================================================

// --- АНАЛОГОВЫЕ VTX ---
export const ANALOG_BANDS = {
  A: {
    label: 'Band A',
    channels: { 1: 5865, 2: 5845, 3: 5825, 4: 5805, 5: 5785, 6: 5765, 7: 5745, 8: 5725 },
  },
  B: {
    label: 'Band B (Boscam)',
    channels: { 1: 5733, 2: 5752, 3: 5771, 4: 5790, 5: 5809, 6: 5828, 7: 5847, 8: 5866 },
  },
  E: {
    label: 'Band E',
    channels: { 1: 5705, 2: 5685, 3: 5665, 4: 5645, 5: 5885, 6: 5905, 7: 5925, 8: 5945 },
  },
  F: {
    label: 'Band F (Airwave)',
    channels: { 1: 5740, 2: 5760, 3: 5780, 4: 5800, 5: 5820, 6: 5840, 7: 5860, 8: 5880 },
  },
  R: {
    label: 'Band C / Raceband (R)',
    channels: { 1: 5658, 2: 5695, 3: 5732, 4: 5769, 5: 5806, 6: 5843, 7: 5880, 8: 5917 },
  },
  D: {
    label: 'Band D (LowRace)',
    channels: { 1: 5362, 2: 5399, 3: 5436, 4: 5473, 5: 5510, 6: 5547, 7: 5584, 8: 5621 },
  },
  U: {
    label: 'Band U',
    channels: { 1: 5325, 2: 5348, 3: 5366, 4: 5384, 5: 5402, 6: 5420, 7: 5438, 8: 5456 },
  },
  O: {
    label: 'Band O',
    channels: { 1: 5474, 2: 5492, 3: 5510, 4: 5528, 5: 5546, 6: 5564, 7: 5582, 8: 5600 },
  },
  L: {
    label: 'Band L (Lowband)',
    channels: { 1: 5333, 2: 5373, 3: 5413, 4: 5453, 5: 5493, 6: 5533, 7: 5573, 8: 5613 },
  },
  H: {
    label: 'Band H',
    channels: { 1: 5653, 2: 5693, 3: 5733, 4: 5773, 5: 5813, 6: 5853, 7: 5893, 8: 5933 },
  },
  X: {
    label: 'Band X',
    channels: { 1: 4990, 2: 5020, 3: 5050, 4: 5080, 5: 5110, 6: 5140, 7: 5170, 8: 5200 },
  },
  J: {
    label: 'Band J',
    channels: { 1: 4867, 2: 4884, 3: 4921, 4: 4958, 5: 4995, 6: 5032, 7: 5069, 8: 5099 },
  },
  K: {
    label: 'Band K',
    channels: { 1: 5960, 2: 5980, 3: 6000, 4: 6020, 5: 6040, 6: 6060, 7: 6080, 8: 6100 },
  },
  Z: {
    label: 'Band Z',
    channels: { 1: 6002, 2: 6028, 3: 6054, 4: 6080, 5: 6106, 6: 6132, 7: 6158, 8: 6184 },
  },
};

// --- ЦИФРОВЫЕ VTX ---
// null означает — канал не используется / недоступен
export const DIGITAL_SYSTEMS = {
  'DJI V1 25Mbps': {
    label: 'DJI V1 (25 Mbps)',
    channels: { 1: 5660, 2: 5695, 3: 5735, 4: 5770, 5: 5805, 6: 5878, 7: 5914, 8: 5839 },
  },
  'DJI V1 50Mbps': {
    label: 'DJI V1 (50 Mbps)',
    channels: { 1: 5695, 2: 5770, 3: 5878, 4: null, 5: null, 6: null, 7: null, 8: 5839 },
  },
  'DJI O3 10/20MHz': {
    label: 'DJI O3 (10/20 MHz, 14/25 Mbps)',
    channels: { 1: 5669, 2: 5705, 3: 5768, 4: 5804, 5: 5839, 6: 5876, 7: 5912, 8: null },
  },
  'DJI O3 40MHz': {
    label: 'DJI O3 (40 MHz, 50 Mbps)',
    channels: { 1: 5677, 2: 5794, 3: 5902, 4: null, 5: null, 6: null, 7: null, 8: null },
  },
  'DJI O4 10/20MHz': {
    label: 'DJI O4 (10 MHz / 20 MHz)',
    channels: { 1: 5768, 2: 5789, 3: 5814, 4: null, 5: null, 6: null, 7: null, 8: null },
  },
  'DJI O4 40/60MHz': {
    label: 'DJI O4 (40 MHz / 60 MHz)',
    channels: { 1: 5794, 2: null, 3: null, 4: null, 5: null, 6: null, 7: null, 8: null },
  },
  'DJI O4 Race': {
    label: 'DJI O4 Race Mode',
    channels: { 1: 5658, 2: 5695, 3: 5732, 4: 5769, 5: 5806, 6: 5843, 7: 5880, 8: 5917 },
  },
  'Walksnail Race CH1-8': {
    label: 'Walksnail Race Mode (CH1–CH8)',
    channels: { 1: 5658, 2: 5695, 3: 5732, 4: 5769, 5: 5806, 6: 5843, 7: 5880, 8: 5917 },
  },
  'Walksnail Race LowBand': {
    label: 'Walksnail Race Mode Low Band (CH9–CH16)',
    channels: { 1: 5620, 2: 5580, 3: 5540, 4: 5500, 5: 5460, 6: 5420, 7: 5380, 8: 5340 },
  },
  'Walksnail 25Mbps': {
    label: 'Walksnail (25 Mbps)',
    channels: { 1: 5660, 2: 5695, 3: 5735, 4: 5770, 5: 5805, 6: 5878, 7: 5914, 8: 5839 },
  },
  'Walksnail 50Mbps': {
    label: 'Walksnail (50 Mbps)',
    channels: { 1: 5695, 2: 5770, 3: 5878, 4: null, 5: null, 6: null, 7: null, 8: 5839 },
  },
  'HDZero Raceband': {
    label: 'HDZero Raceband',
    channels: { 1: 5658, 2: 5695, 3: 5732, 4: 5769, 5: 5806, 6: 5843, 7: 5880, 8: 5917 },
  },
  'HDZero F Band': {
    label: 'HDZero F Band',
    channels: { 1: null, 2: 5760, 3: null, 4: 5800, 5: null, 6: null, 7: null, 8: null },
  },
};

// Порог конфликта в МГц — если разница частот меньше этого значения — конфликт
export const CONFLICT_THRESHOLD_MHZ = 40;

/**
 * Возвращает частоту по системе / band + channel
 * @param {'analog'|'digital'} type
 * @param {string} systemOrBand  — для аналога: ключ ANALOG_BANDS, для цифры: ключ DIGITAL_SYSTEMS
 * @param {number} channel — 1..8
 * @returns {number|null}
 */
export function getFrequency(type, systemOrBand, channel) {
  if (type === 'analog') {
    return ANALOG_BANDS[systemOrBand]?.channels[channel] ?? null;
  }
  return DIGITAL_SYSTEMS[systemOrBand]?.channels[channel] ?? null;
}

/**
 * Проверяет конфликт двух частот (< CONFLICT_THRESHOLD_MHZ МГц разница)
 * @param {number|null} freqA
 * @param {number|null} freqB
 * @returns {boolean}
 */
export function hasFrequencyConflict(freqA, freqB) {
  if (!freqA || !freqB) return false;
  return Math.abs(freqA - freqB) < CONFLICT_THRESHOLD_MHZ;
}

/**
 * Среди маркеров находит все пары с конфликтом частот
 * Возвращает Set из marker id-ов, у которых есть конфликт
 * @param {Array} markers
 * @returns {Set<string>}
 */
export function findConflictingMarkers(markers) {
  const conflictIds = new Set();
  for (let i = 0; i < markers.length; i++) {
    for (let j = i + 1; j < markers.length; j++) {
      const freqA = markers[i].drone?.frequency_mhz;
      const freqB = markers[j].drone?.frequency_mhz;
      if (hasFrequencyConflict(freqA, freqB)) {
        conflictIds.add(markers[i].id);
        conflictIds.add(markers[j].id);
      }
    }
  }
  return conflictIds;
}

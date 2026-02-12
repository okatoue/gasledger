import { metersToMiles, metersToKm } from '@/services/fuel/unitConverter';

/** Timer-style: "1:23:45" or "23:45" */
export function formatDurationTimer(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** Label-style: "1h 23m" or "23m 5s" or "0s" */
export function formatDurationLabel(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.round(seconds % 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export function formatDistance(meters: number, unit: 'mi' | 'km'): string {
  const value = unit === 'mi' ? metersToMiles(meters) : metersToKm(meters);
  return `${value.toFixed(1)} ${unit}`;
}

export function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

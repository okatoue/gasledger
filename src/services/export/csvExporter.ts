import { Session } from '@/db/repositories/sessionRepository';
import { Vehicle } from '@/services/vehicle/vehicleService';
import { metersToMiles, metersToKm } from '@/services/fuel/unitConverter';

interface ExportOptions {
  distanceUnit: 'mi' | 'km';
  volumeUnit: 'gal' | 'l';
}

function formatDurationCSV(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

export function exportSessionsCsv(
  sessions: Session[],
  vehicles: Vehicle[],
  options: ExportOptions,
): string {
  const vehicleMap = new Map<string, string>();
  for (const v of vehicles) {
    vehicleMap.set(v.id, `${v.year} ${v.make} ${v.model}`);
  }

  const distLabel = options.distanceUnit === 'mi' ? 'Distance (mi)' : 'Distance (km)';
  const fuelLabel = options.volumeUnit === 'gal' ? 'Fuel Used (gal)' : 'Fuel Used (L)';

  const headers = [
    'Date',
    'Vehicle',
    distLabel,
    'Duration',
    'Stopped',
    'Fuel Type',
    'Gas Price',
    fuelLabel,
    'Cost',
    'Notes',
  ];

  const rows = sessions.map((s) => {
    const dist =
      options.distanceUnit === 'mi' ? metersToMiles(s.distance_m) : metersToKm(s.distance_m);
    const dur =
      s.ended_at_user && s.started_at_user
        ? Math.floor(
            (new Date(s.ended_at_user).getTime() - new Date(s.started_at_user).getTime()) / 1000,
          )
        : 0;

    return [
      s.started_at_user,
      vehicleMap.get(s.vehicle_id) ?? 'Unknown',
      dist.toFixed(1),
      formatDurationCSV(dur),
      formatDurationCSV(s.stopped_seconds),
      s.fuel_type,
      (s.gas_price_value ?? 0).toFixed(3),
      (s.est_fuel_used ?? 0).toFixed(2),
      (s.est_cost ?? 0).toFixed(2),
      (s.notes ?? '').replace(/"/g, '""'),
    ];
  });

  return (
    headers.join(',') +
    '\n' +
    rows.map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n')
  );
}

import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import { BACKGROUND_LOCATION_TASK } from '@/utils/constants';
import { processLocationUpdate } from './locationUpdateHandler';

// Must be called at module-level scope (not inside a component).
// Import this file in app/_layout.tsx to ensure registration before any component renders.
TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    console.error('[BG-TASK] Error:', error.message);
    return;
  }
  if (data) {
    const { locations } = data as { locations: Location.LocationObject[] };
    console.log(`[GPS] Batch received: ${locations.length} point(s)`);
    for (const loc of locations) {
      console.log(
        `[GPS] Raw fix — acc: ${loc.coords.accuracy?.toFixed(1) ?? 'null'}m, ` +
        `speed: ${loc.coords.speed?.toFixed(2) ?? 'null'} m/s, ` +
        `lat: ${loc.coords.latitude.toFixed(6)}, lon: ${loc.coords.longitude.toFixed(6)}, ` +
        `ts: ${new Date(loc.timestamp).toISOString()}`,
      );
      processLocationUpdate({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        accuracy: loc.coords.accuracy,
        speed: loc.coords.speed,
        timestamp: loc.timestamp,
      });
    }
  }
});

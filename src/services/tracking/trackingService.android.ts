import * as Location from 'expo-location';
import { BACKGROUND_LOCATION_TASK, GPS_SAMPLING_INTERVAL_MOVING_MS } from '@/utils/constants';
import { initSession, teardownSession } from './locationUpdateHandler';
import type { TrackingServiceInterface, TrackingConfig, TrackingResult } from './trackingService';

export const trackingService: TrackingServiceInterface = {
  async startTracking(config: TrackingConfig): Promise<void> {
    initSession(config.sessionId, config.routeEnabled);

    await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
      accuracy: Location.Accuracy.High,
      timeInterval: GPS_SAMPLING_INTERVAL_MOVING_MS,
      distanceInterval: 5,
      foregroundService: {
        notificationTitle: 'GasLedger',
        notificationBody: 'Tracking your driving session',
        notificationColor: '#2563EB',
      },
      pausesUpdatesAutomatically: false,
    });
  },

  async stopTracking(): Promise<TrackingResult> {
    const isRunning = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
    if (isRunning) {
      await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
    }
    return teardownSession();
  },

  async isTracking(): Promise<boolean> {
    return Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
  },
};

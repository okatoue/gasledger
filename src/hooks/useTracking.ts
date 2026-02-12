import { useCallback } from 'react';
import { useRouter } from 'expo-router';
import { trackingService } from '@/services/tracking/trackingService';
import { sessionRepository } from '@/db/repositories/sessionRepository';
import { useSessionStore } from '@/stores/sessionStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useLocationPermission } from './useLocationPermission';
import { metersToMiles } from '@/services/fuel/unitConverter';

interface StartTrackingInput {
  userId: string;
  vehicleId: string;
  fuelGrade: string;
  gasPriceValue: number;
  gasPriceUnit: string;
  gasPriceCurrency: string;
}

export function useTracking() {
  const router = useRouter();
  const { hasPermission, requestForeground, requestBackground } = useLocationPermission();
  const { setActiveSession, setTracking, reset } = useSessionStore();
  const routeStorageEnabled = useSettingsStore((s) => s.routeStorageEnabled);

  const startTracking = useCallback(
    async (input: StartTrackingInput) => {
      // 1. Ensure foreground permission
      if (!hasPermission) {
        const granted = await requestForeground();
        if (!granted) {
          return { success: false as const, reason: 'permission_denied' };
        }
      }

      // Attempt background (non-blocking — limited mode is acceptable)
      await requestBackground().catch(() => {});

      // 2. Create session in DB
      const sessionId = await sessionRepository.create({
        userId: input.userId,
        vehicleId: input.vehicleId,
        fuelGrade: input.fuelGrade,
        gasPriceValue: input.gasPriceValue,
        gasPriceUnit: input.gasPriceUnit,
        gasPriceCurrency: input.gasPriceCurrency,
        routeEnabled: routeStorageEnabled,
      });

      // 3. Update Zustand store
      setActiveSession(sessionId);
      setTracking(true);

      // 4. Start platform tracking service
      await trackingService.startTracking({
        sessionId,
        routeEnabled: routeStorageEnabled,
      });

      return { success: true as const, sessionId };
    },
    [hasPermission, requestForeground, requestBackground, routeStorageEnabled, setActiveSession, setTracking],
  );

  const stopTracking = useCallback(
    async (efficiencyMpg: number, gasPricePerGal: number) => {
      const sessionId = useSessionStore.getState().activeSessionId;
      if (!sessionId) return;

      // 1. Stop platform tracking — flushes pending route points, returns totals
      const totals = await trackingService.stopTracking();

      // 2. Calculate final fuel/cost
      const miles = metersToMiles(totals.distanceM);
      const gallonsUsed = efficiencyMpg > 0 ? miles / efficiencyMpg : 0;
      const estCost = gallonsUsed * gasPricePerGal;

      // 3. Complete session in DB
      await sessionRepository.complete(sessionId, {
        distanceM: totals.distanceM,
        stoppedSeconds: totals.stoppedSeconds,
        estFuelUsed: gallonsUsed,
        estCost,
        routePointsCount: totals.routePointCount,
      });

      // 4. Reset store
      setTracking(false);

      // 5. Navigate to summary
      router.push(`/session/summary?sessionId=${sessionId}`);

      // 6. Reset store after navigation
      setTimeout(() => reset(), 100);
    },
    [router, setTracking, reset],
  );

  return { startTracking, stopTracking };
}

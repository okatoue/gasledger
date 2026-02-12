import { processLocationPoint, resetProcessor } from './locationProcessor';
import { haversineDistance } from './distanceCalculator';
import { processSpeedUpdate, resetStoppedTimeDetector } from './stoppedTimeDetector';
import { useSessionStore } from '@/stores/sessionStore';
import { sessionRepository } from '@/db/repositories/sessionRepository';
import { routePointRepository } from '@/db/repositories/routePointRepository';
import { ACCURACY_GOOD_M, ACCURACY_WEAK_M, GAP_TIME_THRESHOLD_S } from '@/utils/constants';

interface AcceptedPoint {
  latitude: number;
  longitude: number;
  accuracy_m: number;
  speed_mps: number | null;
  timestamp: number;
}

// Module-level state — background task callbacks can't access React state
let currentSessionId: string | null = null;
let routeEnabled = false;
let totalDistanceM = 0;
let lastAcceptedLat: number | null = null;
let lastAcceptedLon: number | null = null;
let pendingRoutePoints: AcceptedPoint[] = [];
let routePointCount = 0;
let lastAcceptedTimestamp: number | null = null;
let firstFixRecorded = false;
let acceptedPointCount = 0;

const BATCH_FLUSH_SIZE = 10;
const DB_PERSIST_INTERVAL = 5;

export function initSession(sessionId: string, routeEnabledFlag: boolean): void {
  currentSessionId = sessionId;
  routeEnabled = routeEnabledFlag;
  totalDistanceM = 0;
  lastAcceptedLat = null;
  lastAcceptedLon = null;
  lastAcceptedTimestamp = null;
  pendingRoutePoints = [];
  routePointCount = 0;
  firstFixRecorded = false;
  acceptedPointCount = 0;
  resetProcessor();
  resetStoppedTimeDetector();
}

export function teardownSession(): {
  distanceM: number;
  stoppedSeconds: number;
  routePointCount: number;
} {
  // Flush remaining route points
  if (routeEnabled && pendingRoutePoints.length > 0 && currentSessionId) {
    routePointRepository.insertBatch(currentSessionId, pendingRoutePoints).catch((e) =>
      console.error('[Tracking] Failed to flush route points:', e),
    );
  }

  const result = {
    distanceM: totalDistanceM,
    stoppedSeconds: useSessionStore.getState().stoppedSeconds,
    routePointCount,
  };

  currentSessionId = null;
  return result;
}

export function processLocationUpdate(raw: {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  speed: number | null;
  timestamp: number;
}): void {
  if (!currentSessionId) return;

  const store = useSessionStore.getState();

  // Update GPS signal indicator based on accuracy
  if (raw.accuracy === null || raw.accuracy > ACCURACY_WEAK_M) {
    store.setGpsSignal('lost');
  } else if (raw.accuracy > ACCURACY_GOOD_M) {
    store.setGpsSignal('weak');
  } else {
    store.setGpsSignal('good');
  }

  // Run through location processor (accuracy gate, min distance, speed jump rejection)
  const accepted = processLocationPoint(raw);
  if (!accepted) return;

  // Record first fix timestamp
  if (!firstFixRecorded) {
    firstFixRecorded = true;
    sessionRepository.setTrackingStarted(currentSessionId).catch((e) =>
      console.error('[Tracking] Failed to set tracking started:', e),
    );
  }

  // Accumulate distance — skip segment if there was a time gap (tunnel, garage, etc.)
  if (lastAcceptedLat !== null && lastAcceptedLon !== null && lastAcceptedTimestamp !== null) {
    const timeSinceLastS = (accepted.timestamp - lastAcceptedTimestamp) / 1000;
    if (timeSinceLastS <= GAP_TIME_THRESHOLD_S) {
      const segmentDistance = haversineDistance(
        lastAcceptedLat,
        lastAcceptedLon,
        accepted.latitude,
        accepted.longitude,
      );
      totalDistanceM += segmentDistance;
    }
    // else: gap too long, don't add straight-line distance
  }
  lastAcceptedLat = accepted.latitude;
  lastAcceptedLon = accepted.longitude;
  lastAcceptedTimestamp = accepted.timestamp;

  // Process stopped time (speed + position cross-check)
  const stoppedSeconds = processSpeedUpdate(accepted.speed_mps, accepted.timestamp, accepted.latitude, accepted.longitude);

  // Update Zustand store (drives UI when in foreground)
  store.updateStats({
    distanceM: totalDistanceM,
    stoppedSeconds,
    elapsedSeconds: store.elapsedSeconds,
  });

  acceptedPointCount++;

  // Queue route point for batch insert
  if (routeEnabled) {
    pendingRoutePoints.push(accepted);
    routePointCount++;
    if (pendingRoutePoints.length >= BATCH_FLUSH_SIZE) {
      routePointRepository
        .insertBatch(currentSessionId!, [...pendingRoutePoints])
        .catch((e) => console.error('[Tracking] Failed to insert route points:', e));
      pendingRoutePoints = [];
    }
  }

  // Periodically persist session totals to DB (crash safety)
  if (acceptedPointCount % DB_PERSIST_INTERVAL === 0) {
    sessionRepository
      .updateTracking(currentSessionId!, {
        distanceM: totalDistanceM,
        stoppedSeconds,
        routePointsCount: routePointCount,
      })
      .catch((e) => console.error('[Tracking] Failed to persist session totals:', e));
  }
}

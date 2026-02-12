import { SPEED_STOPPED_THRESHOLD_MPS, STOPPED_DURATION_THRESHOLD_S, MIN_DISTANCE_THRESHOLD_M } from '@/utils/constants';

interface StoppedTimeState {
  stoppedSince: number | null;
  totalStoppedSeconds: number;
  anchorLat: number | null;
  anchorLon: number | null;
}

let state: StoppedTimeState = { stoppedSince: null, totalStoppedSeconds: 0, anchorLat: null, anchorLon: null };

export function resetStoppedTimeDetector(): void {
  state = { stoppedSince: null, totalStoppedSeconds: 0, anchorLat: null, anchorLon: null };
}

export function processSpeedUpdate(
  speedMps: number | null,
  timestamp: number,
  lat?: number,
  lon?: number,
): number {
  // Consider stopped if speed is low AND position hasn't drifted from the anchor.
  // GPS speed near 0 can be noisy, so we cross-check with actual position movement.
  const speedLow = speedMps === null || speedMps < SPEED_STOPPED_THRESHOLD_MPS;
  let positionMoved = false;

  if (state.anchorLat !== null && state.anchorLon !== null && lat !== undefined && lon !== undefined) {
    const drift = haversineSimple(state.anchorLat, state.anchorLon, lat, lon);
    positionMoved = drift > MIN_DISTANCE_THRESHOLD_M;
  }

  const isStopped = speedLow && !positionMoved;

  if (isStopped) {
    if (state.stoppedSince === null) {
      state.stoppedSince = timestamp;
      if (lat !== undefined && lon !== undefined) {
        state.anchorLat = lat;
        state.anchorLon = lon;
      }
    }
    const duration = (timestamp - state.stoppedSince) / 1000;
    if (duration >= STOPPED_DURATION_THRESHOLD_S) {
      state.totalStoppedSeconds += duration;
      state.stoppedSince = timestamp;
    }
  } else {
    if (state.stoppedSince !== null) {
      const duration = (timestamp - state.stoppedSince) / 1000;
      if (duration >= STOPPED_DURATION_THRESHOLD_S) {
        state.totalStoppedSeconds += duration;
      }
      state.stoppedSince = null;
    }
    // Reset anchor to current position
    if (lat !== undefined && lon !== undefined) {
      state.anchorLat = lat;
      state.anchorLon = lon;
    }
  }

  return state.totalStoppedSeconds;
}

function haversineSimple(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

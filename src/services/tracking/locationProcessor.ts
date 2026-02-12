import {
  MIN_ACCURACY_M,
  MIN_DISTANCE_THRESHOLD_M,
  MAX_SPEED_JUMP_MPS,
} from '@/utils/constants';

interface RawLocationPoint {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  speed: number | null;
  timestamp: number;
}

interface AcceptedPoint {
  latitude: number;
  longitude: number;
  accuracy_m: number;
  speed_mps: number | null;
  timestamp: number;
}

let lastAcceptedPoint: AcceptedPoint | null = null;

export function resetProcessor(): void {
  lastAcceptedPoint = null;
}

export function processLocationPoint(raw: RawLocationPoint): AcceptedPoint | null {
  // 1. Accuracy gate
  if (raw.accuracy === null || raw.accuracy > MIN_ACCURACY_M) {
    return null;
  }

  const point: AcceptedPoint = {
    latitude: raw.latitude,
    longitude: raw.longitude,
    accuracy_m: raw.accuracy,
    speed_mps: raw.speed,
    timestamp: raw.timestamp,
  };

  if (!lastAcceptedPoint) {
    lastAcceptedPoint = point;
    return point;
  }

  // 2. Min distance check
  const dist = haversineDistanceSimple(
    lastAcceptedPoint.latitude,
    lastAcceptedPoint.longitude,
    point.latitude,
    point.longitude,
  );
  if (dist < MIN_DISTANCE_THRESHOLD_M) {
    return null;
  }

  // 3. Speed jump rejection
  const timeDelta = (point.timestamp - lastAcceptedPoint.timestamp) / 1000;
  if (timeDelta > 0) {
    const impliedSpeed = dist / timeDelta;
    if (impliedSpeed > MAX_SPEED_JUMP_MPS) {
      return null;
    }
  }

  lastAcceptedPoint = point;
  return point;
}

function haversineDistanceSimple(lat1: number, lon1: number, lat2: number, lon2: number): number {
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

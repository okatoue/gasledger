export interface TrackingConfig {
  sessionId: string;
  routeEnabled: boolean;
}

export interface TrackingResult {
  distanceM: number;
  stoppedSeconds: number;
  routePointCount: number;
}

export interface TrackingServiceInterface {
  startTracking(config: TrackingConfig): Promise<void>;
  stopTracking(): Promise<TrackingResult>;
  isTracking(): Promise<boolean>;
}

// Placeholder — Metro resolves to .ios.ts or .android.ts at runtime
export const trackingService: TrackingServiceInterface = {
  async startTracking() {},
  async stopTracking() { return { distanceM: 0, stoppedSeconds: 0, routePointCount: 0 }; },
  async isTracking() { return false; },
};

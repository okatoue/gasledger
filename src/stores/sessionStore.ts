import { create } from 'zustand';

type GpsSignal = 'good' | 'weak' | 'lost';

interface ActiveSessionState {
  activeSessionId: string | null;
  isTracking: boolean;
  distanceM: number;
  stoppedSeconds: number;
  elapsedSeconds: number;
  estimatedCost: number;
  gpsSignal: GpsSignal;
  isTrackingPaused: boolean;
  setActiveSession: (id: string | null) => void;
  setTracking: (tracking: boolean) => void;
  updateStats: (stats: {
    distanceM: number;
    stoppedSeconds: number;
    elapsedSeconds: number;
    estimatedCost?: number;
  }) => void;
  setGpsSignal: (signal: GpsSignal) => void;
  setTrackingPaused: (paused: boolean) => void;
  reset: () => void;
}

export const useSessionStore = create<ActiveSessionState>((set) => ({
  activeSessionId: null,
  isTracking: false,
  distanceM: 0,
  stoppedSeconds: 0,
  elapsedSeconds: 0,
  estimatedCost: 0,
  gpsSignal: 'good',
  isTrackingPaused: false,
  setActiveSession: (id) => set({ activeSessionId: id }),
  setTracking: (isTracking) => set({ isTracking }),
  updateStats: (stats) =>
    set((state) => ({
      ...stats,
      estimatedCost: stats.estimatedCost ?? state.estimatedCost,
    })),
  setGpsSignal: (gpsSignal) => set({ gpsSignal }),
  setTrackingPaused: (isTrackingPaused) => set({ isTrackingPaused }),
  reset: () =>
    set({
      activeSessionId: null,
      isTracking: false,
      distanceM: 0,
      stoppedSeconds: 0,
      elapsedSeconds: 0,
      estimatedCost: 0,
      gpsSignal: 'good',
      isTrackingPaused: false,
    }),
}));

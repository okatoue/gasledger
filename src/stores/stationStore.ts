import { create } from 'zustand';
import { GasStation } from '@/services/places/placesService';

interface UserLocation {
  latitude: number;
  longitude: number;
}

interface PendingSelection {
  price: number;
  stationName: string;
}

interface StationState {
  stations: GasStation[];
  userLocation: UserLocation | null;
  isLoading: boolean;
  error: string | null;
  pendingSelection: PendingSelection | null;
  setStations: (stations: GasStation[]) => void;
  setUserLocation: (location: UserLocation) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setPendingSelection: (selection: PendingSelection) => void;
  clearPendingSelection: () => void;
}

export const useStationStore = create<StationState>((set) => ({
  stations: [],
  userLocation: null,
  isLoading: false,
  error: null,
  pendingSelection: null,
  setStations: (stations) => set({ stations }),
  setUserLocation: (userLocation) => set({ userLocation }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  setPendingSelection: (pendingSelection) => set({ pendingSelection }),
  clearPendingSelection: () => set({ pendingSelection: null }),
}));

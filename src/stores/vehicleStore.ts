import { create } from 'zustand';
import type { Vehicle } from '@/services/vehicle/vehicleService';
import { vehicleService } from '@/services/vehicle/vehicleService';
import { vehicleRepository } from '@/db/repositories/vehicleRepository';

interface VehicleState {
  vehicles: Vehicle[];
  isLoaded: boolean;
  loadVehicles: (userId: string) => Promise<void>;
  refreshVehicles: (userId: string) => Promise<void>;
}

export const useVehicleStore = create<VehicleState>((set) => ({
  vehicles: [],
  isLoaded: false,

  loadVehicles: async (userId: string) => {
    try {
      const cached = await vehicleRepository.getByUser(userId);
      set({ vehicles: cached, isLoaded: true });
    } catch (error) {
      console.error('[VehicleStore] Failed to load from SQLite:', error);
      set({ isLoaded: true });
    }
  },

  refreshVehicles: async (userId: string) => {
    try {
      const fresh = await vehicleService.getByUser(userId);
      set({ vehicles: fresh, isLoaded: true });
      vehicleRepository.upsertAll(userId, fresh).catch(console.error);
    } catch (error) {
      console.error('[VehicleStore] Failed to refresh from Supabase:', error);
      // Keep cached data on network failure
    }
  },
}));

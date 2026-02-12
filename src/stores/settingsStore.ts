import { create } from 'zustand';
import { settingsRepository } from '@/db/repositories/settingsRepository';

interface SettingsState {
  _userId: string | null;
  distanceUnit: 'mi' | 'km';
  volumeUnit: 'gal' | 'l';
  currency: string;
  routeStorageEnabled: boolean;
  loadSettings: (userId: string) => Promise<void>;
  setDistanceUnit: (unit: 'mi' | 'km') => void;
  setVolumeUnit: (unit: 'gal' | 'l') => void;
  setCurrency: (currency: string) => void;
  setRouteStorageEnabled: (enabled: boolean) => void;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  _userId: null,
  distanceUnit: 'mi',
  volumeUnit: 'gal',
  currency: 'usd',
  routeStorageEnabled: true,

  loadSettings: async (userId: string) => {
    set({ _userId: userId });
    try {
      const settings = await settingsRepository.get(userId);
      if (settings) {
        set({
          distanceUnit: settings.distance_unit,
          volumeUnit: settings.volume_unit,
          currency: settings.currency,
          routeStorageEnabled: settings.route_storage_enabled === 1,
        });
      } else {
        // Ensure user row exists so FK constraints on sessions/vehicles are satisfied
        await settingsRepository.upsert(userId, {});
      }
    } catch (error) {
      console.error('[SettingsStore] Failed to load settings:', error);
    }
  },

  setDistanceUnit: (distanceUnit) => {
    set({ distanceUnit });
    const userId = get()._userId;
    if (userId) {
      settingsRepository.upsert(userId, { distance_unit: distanceUnit }).catch(() => {});
    }
  },

  setVolumeUnit: (volumeUnit) => {
    set({ volumeUnit });
    const userId = get()._userId;
    if (userId) {
      settingsRepository.upsert(userId, { volume_unit: volumeUnit }).catch(() => {});
    }
  },

  setCurrency: (currency) => {
    set({ currency });
    const userId = get()._userId;
    if (userId) {
      settingsRepository.upsert(userId, { currency }).catch(() => {});
    }
  },

  setRouteStorageEnabled: (enabled) => {
    set({ routeStorageEnabled: enabled });
    const userId = get()._userId;
    if (userId) {
      settingsRepository.upsert(userId, { route_storage_enabled: enabled ? 1 : 0 }).catch(() => {});
    }
  },
}));

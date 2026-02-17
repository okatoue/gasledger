import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { settingsRepository } from '@/db/repositories/settingsRepository';
import { syncService } from '@/services/sync/syncService';
import { getLocaleDefaults } from '@/utils/localeDefaults';

const LOCATION_MODE_KEY = 'gasledger_location_mode';
const POSTAL_CODE_KEY = 'gasledger_postal_code';
const COLOR_SCHEME_KEY = 'gasledger_color_scheme';
type LocationMode = 'full' | 'limited' | null;
type ColorScheme = 'system' | 'light' | 'dark';

interface SettingsState {
  _userId: string | null;
  distanceUnit: 'mi' | 'km';
  volumeUnit: 'gal' | 'l';
  currency: string;
  routeStorageEnabled: boolean;
  locationMode: LocationMode;
  postalCode: string | null;
  colorScheme: ColorScheme;
  loadSettings: (userId: string) => Promise<void>;
  setDistanceUnit: (unit: 'mi' | 'km') => void;
  setVolumeUnit: (unit: 'gal' | 'l') => void;
  setCurrency: (currency: string) => void;
  setRouteStorageEnabled: (enabled: boolean) => void;
  setLocationMode: (mode: 'full' | 'limited') => void;
  setPostalCode: (code: string) => void;
  setColorScheme: (scheme: ColorScheme) => void;
}

const _localeDefaults = getLocaleDefaults();

export const useSettingsStore = create<SettingsState>((set, get) => ({
  _userId: null,
  distanceUnit: _localeDefaults.distanceUnit,
  volumeUnit: _localeDefaults.volumeUnit,
  currency: _localeDefaults.currency,
  routeStorageEnabled: true,
  locationMode: null,
  postalCode: null,
  colorScheme: 'system',

  loadSettings: async (userId: string) => {
    set({ _userId: userId });
    try {
      const storedMode = await SecureStore.getItemAsync(LOCATION_MODE_KEY);
      if (storedMode === 'full' || storedMode === 'limited') {
        set({ locationMode: storedMode });
      }
      const storedPostal = await SecureStore.getItemAsync(POSTAL_CODE_KEY);
      if (storedPostal) {
        set({ postalCode: storedPostal });
      }
      const storedColorScheme = await SecureStore.getItemAsync(COLOR_SCHEME_KEY);
      if (storedColorScheme === 'light' || storedColorScheme === 'dark' || storedColorScheme === 'system') {
        set({ colorScheme: storedColorScheme });
      }
      const settings = await settingsRepository.get(userId);
      if (settings) {
        set({
          distanceUnit: settings.distance_unit,
          volumeUnit: settings.volume_unit,
          currency: settings.currency,
          routeStorageEnabled: settings.route_storage_enabled === 1,
        });
      } else {
        // First-time user: detect defaults from device locale
        const defaults = getLocaleDefaults();
        set({
          distanceUnit: defaults.distanceUnit,
          volumeUnit: defaults.volumeUnit,
          currency: defaults.currency,
        });
        await settingsRepository.upsert(userId, {
          distance_unit: defaults.distanceUnit,
          volume_unit: defaults.volumeUnit,
          currency: defaults.currency,
        });
      }
    } catch (error) {
      console.error('[SettingsStore] Failed to load settings:', error);
    }
  },

  setDistanceUnit: (distanceUnit) => {
    set({ distanceUnit });
    const userId = get()._userId;
    if (userId) {
      settingsRepository.upsert(userId, { distance_unit: distanceUnit })
        .then(() => syncService.syncSettings(userId))
        .catch(() => {});
    }
  },

  setVolumeUnit: (volumeUnit) => {
    set({ volumeUnit });
    const userId = get()._userId;
    if (userId) {
      settingsRepository.upsert(userId, { volume_unit: volumeUnit })
        .then(() => syncService.syncSettings(userId))
        .catch(() => {});
    }
  },

  setCurrency: (currency) => {
    set({ currency });
    const userId = get()._userId;
    if (userId) {
      settingsRepository.upsert(userId, { currency })
        .then(() => syncService.syncSettings(userId))
        .catch(() => {});
    }
  },

  setRouteStorageEnabled: (enabled) => {
    set({ routeStorageEnabled: enabled });
    const userId = get()._userId;
    if (userId) {
      settingsRepository.upsert(userId, { route_storage_enabled: enabled ? 1 : 0 })
        .then(() => syncService.syncSettings(userId))
        .catch(() => {});
    }
  },

  setLocationMode: (mode) => {
    set({ locationMode: mode });
    SecureStore.setItemAsync(LOCATION_MODE_KEY, mode).catch(() => {});
  },

  setPostalCode: (code) => {
    set({ postalCode: code });
    SecureStore.setItemAsync(POSTAL_CODE_KEY, code).catch(() => {});
  },

  setColorScheme: (scheme) => {
    set({ colorScheme: scheme });
    SecureStore.setItemAsync(COLOR_SCHEME_KEY, scheme).catch(() => {});
  },

}));

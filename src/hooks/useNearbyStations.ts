import { useCallback } from 'react';
import * as Location from 'expo-location';
import * as SecureStore from 'expo-secure-store';
import { searchNearbyGasStations } from '@/services/places/placesService';
import { canSearch, markSearched } from '@/services/places/rateLimiter';
import { useStationStore } from '@/stores/stationStore';
import { useSettingsStore } from '@/stores/settingsStore';

const LAST_SEARCH_POSTAL_KEY = 'gasledger_last_station_search_postal';

export function useNearbyStations() {
  const stations = useStationStore((s) => s.stations);
  const isLoading = useStationStore((s) => s.isLoading);
  const error = useStationStore((s) => s.error);
  const userLocation = useStationStore((s) => s.userLocation);
  const patch = useStationStore((s) => s.patch);

  const refresh = useCallback(async () => {
    const postalCode = useSettingsStore.getState().postalCode;

    if (!postalCode || postalCode.trim() === '') {
      patch({ error: 'Please set your zip/postal code to find nearby stations.', isLoading: false });
      return;
    }

    if (!canSearch()) {
      patch({ error: 'Please wait a few seconds before searching again.' });
      return;
    }

    // Skip re-fetch if postal code hasn't changed and stations already exist
    const currentStations = useStationStore.getState().stations;
    if (currentStations.length > 0) {
      try {
        const lastPostal = await SecureStore.getItemAsync(LAST_SEARCH_POSTAL_KEY);
        if (lastPostal === postalCode.trim()) {
          patch({ isLoading: false, error: null });
          return;
        }
      } catch (e) {
        // continue with search
      }
    }

    patch({ isLoading: true, error: null });

    try {
      const trimmed = postalCode.trim();

      // Try geocoding as-is first, then with country suffix as fallback
      // (some devices' native geocoders need country context for bare postal codes)
      const isUSZip = /^\d{5}(-\d{4})?$/.test(trimmed);
      const isCanadianPostal = /^[A-Za-z]\d[A-Za-z]\s?\d[A-Za-z]\d$/.test(trimmed);
      const queries = [trimmed];
      if (isUSZip) queries.push(`${trimmed}, United States`);
      else if (isCanadianPostal) queries.push(`${trimmed}, Canada`);
      else queries.push(`${trimmed}, United States`, `${trimmed}, Canada`);

      let geocoded: Location.LocationGeocodedLocation[] = [];
      for (const query of queries) {
        const result = await Location.geocodeAsync(query);
        if (result && result.length > 0) {
          geocoded = result;
          break;
        }
      }

      if (geocoded.length === 0) {
        patch({ error: 'Could not find location for this postal code.', isLoading: false });
        return;
      }

      const location = {
        latitude: geocoded[0].latitude,
        longitude: geocoded[0].longitude,
      };

      markSearched();
      const results = await searchNearbyGasStations(location);

      // Save last-searched postal code
      try {
        await SecureStore.setItemAsync(LAST_SEARCH_POSTAL_KEY, postalCode.trim());
      } catch (e) {
        // non-critical
      }

      patch({
        userLocation: location,
        stations: results,
        isLoading: false,
        error: results.length === 0 ? 'No gas stations found nearby.' : null,
      });
    } catch (err) {
      console.error('[useNearbyStations] refresh error:', err);
      patch({ error: 'Failed to search for nearby stations.', isLoading: false });
    }
  }, [patch]);

  return { stations, isLoading, error, refresh, userLocation };
}

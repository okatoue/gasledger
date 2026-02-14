import { useCallback } from 'react';
import * as Location from 'expo-location';
import * as SecureStore from 'expo-secure-store';
import { searchNearbyGasStations } from '@/services/places/placesService';
import { haversineDistance } from '@/services/tracking/distanceCalculator';
import { canSearch, markSearched } from '@/services/places/rateLimiter';
import { useStationStore } from '@/stores/stationStore';

const LAST_SEARCH_COORDS_KEY = 'gasledger_last_station_search_coords';
const REFETCH_DISTANCE_M = 3000; // 3 km

export function useNearbyStations() {
  const stations = useStationStore((s) => s.stations);
  const isLoading = useStationStore((s) => s.isLoading);
  const error = useStationStore((s) => s.error);
  const userLocation = useStationStore((s) => s.userLocation);
  const patch = useStationStore((s) => s.patch);

  const refresh = useCallback(async () => {
    if (!canSearch()) {
      patch({ error: 'Please wait a few seconds before searching again.' });
      return;
    }

    patch({ isLoading: true, error: null });

    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== 'granted') {
        patch({ error: 'Location permission is required to find nearby stations.', isLoading: false });
        return;
      }

      let position: Location.LocationObject | null = null;
      try {
        position = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
      } catch {
        position = await Location.getLastKnownPositionAsync();
      }

      if (!position) {
        patch({ error: 'Unable to determine your location.', isLoading: false });
        return;
      }

      const location = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };

      // Check if user has moved far enough to warrant a new search
      const currentStations = useStationStore.getState().stations;
      console.log('[useNearbyStations] current stations in store:', currentStations.length);
      if (currentStations.length > 0) {
        try {
          const saved = await SecureStore.getItemAsync(LAST_SEARCH_COORDS_KEY);
          console.log('[useNearbyStations] saved coords:', saved);
          if (saved) {
            const { latitude: savedLat, longitude: savedLon } = JSON.parse(saved);
            const distance = haversineDistance(savedLat, savedLon, location.latitude, location.longitude);
            console.log('[useNearbyStations] distance from last search:', distance, 'm');
            if (distance < REFETCH_DISTANCE_M) {
              console.log('[useNearbyStations] skipping search — user has not moved 3km');
              patch({ userLocation: location, isLoading: false, error: null });
              return;
            }
          }
        } catch (e) {
          console.warn('[useNearbyStations] SecureStore read error:', e);
        }
      }

      markSearched();
      console.log('[useNearbyStations] calling searchNearbyGasStations...');
      const results = await searchNearbyGasStations(location);
      console.log('[useNearbyStations] search returned', results.length, 'stations');

      // Save search coords for next distance check
      try {
        await SecureStore.setItemAsync(
          LAST_SEARCH_COORDS_KEY,
          JSON.stringify({ latitude: location.latitude, longitude: location.longitude }),
        );
        console.log('[useNearbyStations] saved search coords');
      } catch (e) {
        console.warn('[useNearbyStations] SecureStore write error:', e);
      }

      // Single state update: location + stations + loading + error
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

import { useCallback } from 'react';
import * as Location from 'expo-location';
import { searchNearbyGasStations } from '@/services/places/placesService';
import { canSearch, markSearched } from '@/services/places/rateLimiter';
import { useStationStore } from '@/stores/stationStore';

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

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const location = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };

      markSearched();
      const results = await searchNearbyGasStations(location);

      // Single state update: location + stations + loading + error
      patch({
        userLocation: location,
        stations: results,
        isLoading: false,
        error: results.length === 0 ? 'No gas stations found nearby.' : null,
      });
    } catch {
      patch({ error: 'Failed to search for nearby stations.', isLoading: false });
    }
  }, [patch]);

  return { stations, isLoading, error, refresh, userLocation };
}

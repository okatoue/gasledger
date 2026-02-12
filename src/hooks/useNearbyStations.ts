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
  const setStations = useStationStore((s) => s.setStations);
  const setUserLocation = useStationStore((s) => s.setUserLocation);
  const setLoading = useStationStore((s) => s.setLoading);
  const setError = useStationStore((s) => s.setError);

  const refresh = useCallback(async () => {
    if (!canSearch()) {
      setError('Please wait a few seconds before searching again.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Location permission is required to find nearby stations.');
        setLoading(false);
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      setUserLocation({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });

      markSearched();
      const results = await searchNearbyGasStations({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });

      setStations(results);
      if (results.length === 0) {
        setError('No gas stations found nearby.');
      }
    } catch {
      setError('Failed to search for nearby stations.');
    } finally {
      setLoading(false);
    }
  }, [setStations, setUserLocation, setLoading, setError]);

  return { stations, isLoading, error, refresh, userLocation };
}

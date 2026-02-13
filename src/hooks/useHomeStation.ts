import { useState, useEffect, useCallback } from 'react';
import { homeStationRepository, HomeStation } from '@/db/repositories/homeStationRepository';
import { getStationDetails, GasStation, StationFuelPrice } from '@/services/places/placesService';

const STALE_THRESHOLD_MS = 30 * 60 * 1000; // 30 minutes

export function useHomeStation(userId: string | undefined) {
  const [homeStation, setHomeStation] = useState<HomeStation | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (!userId) {
      setHomeStation(null);
      setIsLoaded(true);
      return;
    }
    let cancelled = false;
    homeStationRepository.get(userId).then((station) => {
      if (cancelled) return;
      setHomeStation(station);
      setIsLoaded(true);
    });
    return () => { cancelled = true; };
  }, [userId]);

  const setHome = useCallback(async (station: GasStation) => {
    if (!userId) return;
    await homeStationRepository.upsert(userId, station);
    const saved = await homeStationRepository.get(userId);
    setHomeStation(saved);
  }, [userId]);

  const removeHome = useCallback(async () => {
    if (!userId) return;
    await homeStationRepository.remove(userId);
    setHomeStation(null);
  }, [userId]);

  const refreshPrice = useCallback(async () => {
    if (!userId || !homeStation) return;

    const updatedAt = homeStation.prices_updated_at
      ? new Date(homeStation.prices_updated_at).getTime()
      : 0;
    if (Date.now() - updatedAt < STALE_THRESHOLD_MS) return;

    const details = await getStationDetails(homeStation.place_id);
    if (!details || details.fuelPrices.length === 0) return;

    await homeStationRepository.updateCachedPrices(userId, details.fuelPrices);
    const updated = await homeStationRepository.get(userId);
    setHomeStation(updated);
  }, [userId, homeStation]);

  const getPriceForType = useCallback(
    (fuelType: string): number | null => {
      if (!homeStation?.cached_prices) return null;
      const match = homeStation.cached_prices.find((p) => p.fuelType === fuelType);
      return match ? match.priceValue : null;
    },
    [homeStation],
  );

  return { homeStation, isLoaded, setHome, removeHome, refreshPrice, getPriceForType };
}

import { useState, useEffect } from 'react';
import { lastPriceRepository } from '@/db/repositories/lastPriceRepository';

const DEFAULT_GAS_PRICE = 3.5;

export type PriceSource = 'manual' | 'home_station' | 'default';

export function useGasPrice(
  vehicleId: string | null,
  fuelGrade: string | null,
  homeStationPrice: number | null = null,
) {
  const [gasPrice, setGasPrice] = useState(DEFAULT_GAS_PRICE);
  const [priceSource, setPriceSource] = useState<PriceSource>('default');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (!vehicleId || !fuelGrade) {
      setGasPrice(DEFAULT_GAS_PRICE);
      setPriceSource('default');
      setIsLoaded(true);
      return;
    }

    let cancelled = false;
    lastPriceRepository.get(vehicleId, fuelGrade).then((record) => {
      if (cancelled) return;
      if (record) {
        setGasPrice(record.price_value);
        setPriceSource('manual');
      } else if (homeStationPrice != null && homeStationPrice > 0) {
        setGasPrice(homeStationPrice);
        setPriceSource('home_station');
      } else {
        setGasPrice(DEFAULT_GAS_PRICE);
        setPriceSource('default');
      }
      setIsLoaded(true);
    });

    return () => { cancelled = true; };
  }, [vehicleId, fuelGrade, homeStationPrice]);

  return { gasPrice, setGasPrice, isLoaded, priceSource };
}

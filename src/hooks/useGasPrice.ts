import { useState, useEffect } from 'react';
import { lastPriceRepository } from '@/db/repositories/lastPriceRepository';

const DEFAULT_GAS_PRICE = 3.5;

export type PriceSource = 'manual' | 'home_station' | 'default';

export function useGasPrice(
  fuelType: string | null,
  homeStationPrice: number | null = null,
) {
  const [gasPrice, setGasPrice] = useState(DEFAULT_GAS_PRICE);
  const [priceSource, setPriceSource] = useState<PriceSource>('default');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (!fuelType) {
      setGasPrice(DEFAULT_GAS_PRICE);
      setPriceSource('default');
      setIsLoaded(true);
      return;
    }

    let cancelled = false;
    lastPriceRepository.get(fuelType).then((record) => {
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
  }, [fuelType, homeStationPrice]);

  return { gasPrice, setGasPrice, isLoaded, priceSource };
}

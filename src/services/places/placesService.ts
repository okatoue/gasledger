import { supabase } from '@/config/supabase';
import { haversineDistance } from '@/services/tracking/distanceCalculator';

// ── Types ──

export interface StationFuelPrice {
  fuelGrade: 'regular' | 'midgrade' | 'premium' | 'diesel';
  priceValue: number;
  currencyCode: string;
  updatedAt: string | null;
}

export interface GasStation {
  placeId: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  distanceM: number;
  fuelPrices: StationFuelPrice[];
}

// ── Public API ──

export async function searchNearbyGasStations(
  location: { latitude: number; longitude: number },
  radiusM: number = 5000,
  maxResults: number = 10,
): Promise<GasStation[]> {
  try {
    const { data, error } = await supabase.functions.invoke('nearby-stations', {
      body: { latitude: location.latitude, longitude: location.longitude, radiusM, maxResults },
    });

    if (error || !Array.isArray(data)) return [];

    // Recalculate client-side distance (edge function returns its own, but
    // the user's exact location may have shifted slightly between calls)
    const stations: GasStation[] = data.map((s: any) => ({
      ...s,
      distanceM: haversineDistance(
        location.latitude,
        location.longitude,
        s.latitude,
        s.longitude,
      ),
    }));

    stations.sort((a, b) => a.distanceM - b.distanceM);
    return stations;
  } catch {
    return [];
  }
}

export async function getStationDetails(placeId: string): Promise<GasStation | null> {
  try {
    const { data, error } = await supabase.functions.invoke('station-prices', {
      body: { placeId },
    });

    if (error || !data) return null;

    return {
      placeId: data.placeId,
      name: data.name,
      address: data.address,
      latitude: data.latitude,
      longitude: data.longitude,
      distanceM: data.distanceM ?? 0,
      fuelPrices: data.fuelPrices ?? [],
    };
  } catch {
    return null;
  }
}

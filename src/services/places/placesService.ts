import { supabase } from '@/config/supabase';
import { haversineDistance } from '@/services/tracking/distanceCalculator';

// ── Types ──

export interface StationFuelPrice {
  fuelType: 'regular' | 'midgrade' | 'premium' | 'diesel';
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

// ── Helpers ──

async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    return { Authorization: `Bearer ${session.access_token}` };
  }
  return {};
}

// ── Public API ──

export async function searchNearbyGasStations(
  location: { latitude: number; longitude: number },
  radiusM: number = 5000,
  maxResults: number = 10,
): Promise<GasStation[]> {
  try {
    const headers = await getAuthHeaders();
    const { data, error } = await supabase.functions.invoke('nearby-stations', {
      body: { latitude: location.latitude, longitude: location.longitude, radiusM, maxResults },
      headers,
    });

    if (error || !Array.isArray(data)) return [];

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
    const headers = await getAuthHeaders();
    const { data, error } = await supabase.functions.invoke('station-prices', {
      body: { placeId },
      headers,
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

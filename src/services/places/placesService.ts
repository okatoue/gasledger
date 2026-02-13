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

const INITIAL_RADIUS_M = 10_000;   // 10 km
const EXPANDED_RADIUS_M = 25_000;  // 25 km
const TARGET_WITH_PRICES = 20;

export async function searchNearbyGasStations(
  location: { latitude: number; longitude: number },
): Promise<GasStation[]> {
  try {
    const headers = await getAuthHeaders();

    // First fetch
    const { data, error } = await supabase.functions.invoke('nearby-stations', {
      body: { latitude: location.latitude, longitude: location.longitude, radiusM: INITIAL_RADIUS_M, maxResults: 20 },
      headers,
    });

    if (error || !Array.isArray(data)) return [];

    let allStations = dedupeAndMap(data, location);

    // If too few stations have prices, expand the radius for more
    const withPrices = allStations.filter((s) => s.fuelPrices.length > 0).length;
    if (withPrices < TARGET_WITH_PRICES) {
      const { data: more } = await supabase.functions.invoke('nearby-stations', {
        body: { latitude: location.latitude, longitude: location.longitude, radiusM: EXPANDED_RADIUS_M, maxResults: 20 },
        headers,
      });
      if (Array.isArray(more)) {
        const seen = new Set(allStations.map((s) => s.placeId));
        const extra = dedupeAndMap(more, location).filter((s) => !seen.has(s.placeId));
        allStations = [...allStations, ...extra];
      }
    }

    allStations.sort((a, b) => a.distanceM - b.distanceM);
    return allStations;
  } catch {
    return [];
  }
}

function dedupeAndMap(
  data: any[],
  location: { latitude: number; longitude: number },
): GasStation[] {
  return data.map((s: any) => ({
    ...s,
    distanceM: haversineDistance(
      location.latitude,
      location.longitude,
      s.latitude,
      s.longitude,
    ),
  }));
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

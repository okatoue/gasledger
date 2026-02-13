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
  console.log('[PlacesService] getAuthHeaders — has session:', !!session, 'has token:', !!session?.access_token, 'token prefix:', session?.access_token?.slice(0, 20));
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
    console.log('[PlacesService] Invoking nearby-stations:', { lat: location.latitude, lng: location.longitude });
    const headers = await getAuthHeaders();
    console.log('[PlacesService] Auth headers:', JSON.stringify(headers).slice(0, 80));
    const { data, error } = await supabase.functions.invoke('nearby-stations', {
      body: { latitude: location.latitude, longitude: location.longitude, radiusM, maxResults },
      headers,
    });

    console.log('[PlacesService] Response — error:', error?.message ?? 'none', 'isArray:', Array.isArray(data), 'length:', Array.isArray(data) ? data.length : 'N/A');

    if (error) {
      console.error('[PlacesService] Function error name:', error?.name, 'status:', error?.context?.status);
      return [];
    }
    if (!Array.isArray(data)) {
      console.error('[PlacesService] Data is not array:', typeof data);
      return [];
    }

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
    console.log('[PlacesService] Returning', stations.length, 'stations');
    return stations;
  } catch (err) {
    console.error('[PlacesService] Caught exception:', err);
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

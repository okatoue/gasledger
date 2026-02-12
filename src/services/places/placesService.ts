import { env } from '@/config/env';
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

// ── Google fuel type → app grade mapping ──

const FUEL_TYPE_MAP: Record<string, StationFuelPrice['fuelGrade']> = {
  REGULAR_UNLEADED: 'regular',
  MIDGRADE: 'midgrade',
  PREMIUM: 'premium',
  DIESEL: 'diesel',
};

// ── Helpers ──

function parseGoogleMoney(money: { units?: string; nanos?: number; currencyCode?: string }): {
  value: number;
  currencyCode: string;
} {
  const units = parseInt(money.units ?? '0', 10);
  const nanos = money.nanos ?? 0;
  return {
    value: units + nanos / 1_000_000_000,
    currencyCode: money.currencyCode ?? 'USD',
  };
}

function parseFuelPrices(fuelOptions?: { fuelPrices?: any[] }): StationFuelPrice[] {
  if (!fuelOptions?.fuelPrices) return [];

  const prices: StationFuelPrice[] = [];
  for (const fp of fuelOptions.fuelPrices) {
    const grade = FUEL_TYPE_MAP[fp.type];
    if (!grade || !fp.price) continue;

    const { value, currencyCode } = parseGoogleMoney(fp.price);
    if (value <= 0) continue;

    prices.push({
      fuelGrade: grade,
      priceValue: value,
      currencyCode,
      updatedAt: fp.updateTime ?? null,
    });
  }
  return prices;
}

// ── Public API ──

export async function searchNearbyGasStations(
  location: { latitude: number; longitude: number },
  radiusM: number = 5000,
  maxResults: number = 10,
): Promise<GasStation[]> {
  const apiKey = env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) return [];

  try {
    const response = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask':
          'places.id,places.displayName,places.formattedAddress,places.shortFormattedAddress,places.location,places.fuelOptions',
      },
      body: JSON.stringify({
        includedTypes: ['gas_station'],
        maxResultCount: maxResults,
        locationRestriction: {
          circle: {
            center: { latitude: location.latitude, longitude: location.longitude },
            radius: radiusM,
          },
        },
      }),
    });

    if (!response.ok) return [];

    const data = await response.json();
    if (!data.places || !Array.isArray(data.places)) return [];

    const stations: GasStation[] = data.places.map((place: any) => ({
      placeId: place.id,
      name: place.displayName?.text ?? 'Unknown Station',
      address: place.shortFormattedAddress ?? place.formattedAddress ?? '',
      latitude: place.location?.latitude ?? 0,
      longitude: place.location?.longitude ?? 0,
      distanceM: haversineDistance(
        location.latitude,
        location.longitude,
        place.location?.latitude ?? 0,
        place.location?.longitude ?? 0,
      ),
      fuelPrices: parseFuelPrices(place.fuelOptions),
    }));

    stations.sort((a, b) => a.distanceM - b.distanceM);
    return stations;
  } catch {
    return [];
  }
}

export async function getStationDetails(placeId: string): Promise<GasStation | null> {
  const apiKey = env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) return null;

  try {
    const response = await fetch(
      `https://places.googleapis.com/v1/places/${placeId}`,
      {
        method: 'GET',
        headers: {
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask':
            'id,displayName,formattedAddress,shortFormattedAddress,location,fuelOptions',
        },
      },
    );

    if (!response.ok) return null;

    const place = await response.json();
    return {
      placeId: place.id,
      name: place.displayName?.text ?? 'Unknown Station',
      address: place.shortFormattedAddress ?? place.formattedAddress ?? '',
      latitude: place.location?.latitude ?? 0,
      longitude: place.location?.longitude ?? 0,
      distanceM: 0,
      fuelPrices: parseFuelPrices(place.fuelOptions),
    };
  } catch {
    return null;
  }
}

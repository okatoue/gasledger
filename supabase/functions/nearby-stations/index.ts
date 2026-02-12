import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const STALE_MINUTES = 30;

const FUEL_TYPE_MAP: Record<string, string> = {
  REGULAR_UNLEADED: 'regular',
  MIDGRADE: 'midgrade',
  PREMIUM: 'premium',
  DIESEL: 'diesel',
};

function parseGoogleMoney(money: { units?: string; nanos?: number; currencyCode?: string }) {
  const units = parseInt(money.units ?? '0', 10);
  const nanos = money.nanos ?? 0;
  return {
    value: units + nanos / 1_000_000_000,
    currencyCode: money.currencyCode ?? 'USD',
  };
}

interface StationFuelPrice {
  fuelGrade: string;
  priceValue: number;
  currencyCode: string;
  updatedAt: string | null;
}

interface GasStation {
  placeId: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  distanceM: number;
  fuelPrices: StationFuelPrice[];
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

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  try {
    const { latitude, longitude, radiusM = 5000, maxResults = 10 } = await req.json();

    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      return new Response(JSON.stringify({ error: 'latitude and longitude are required' }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Bounding box for cache lookup (approximate degrees for the radius)
    const degPerMeter = 1 / 111_320;
    const latDelta = radiusM * degPerMeter;
    const lonDelta = radiusM * degPerMeter / Math.cos((latitude * Math.PI) / 180);

    const freshThreshold = new Date(Date.now() - STALE_MINUTES * 60 * 1000).toISOString();

    // Check cache: fresh rows within bounding box
    const { data: cached } = await supabase
      .from('station_prices')
      .select('*')
      .gte('latitude', latitude - latDelta)
      .lte('latitude', latitude + latDelta)
      .gte('longitude', longitude - lonDelta)
      .lte('longitude', longitude + lonDelta)
      .gte('updated_at', freshThreshold);

    // Group cached rows by place_id
    const stationMap = new Map<string, typeof cached>();
    if (cached && cached.length > 0) {
      for (const row of cached) {
        const existing = stationMap.get(row.place_id) ?? [];
        existing.push(row);
        stationMap.set(row.place_id, existing);
      }
    }

    // If we have enough fresh cached stations, return them directly
    if (stationMap.size >= maxResults) {
      const stations: GasStation[] = [];
      for (const [placeId, rows] of stationMap) {
        const first = rows[0];
        stations.push({
          placeId,
          name: first.station_name ?? 'Unknown Station',
          address: first.station_address ?? '',
          latitude: Number(first.latitude),
          longitude: Number(first.longitude),
          distanceM: haversineDistance(latitude, longitude, Number(first.latitude), Number(first.longitude)),
          fuelPrices: rows.map((r: any) => ({
            fuelGrade: r.fuel_grade,
            priceValue: Number(r.price_value),
            currencyCode: r.currency_code,
            updatedAt: r.source_updated_at,
          })),
        });
      }
      stations.sort((a, b) => a.distanceM - b.distanceM);
      return new Response(JSON.stringify(stations.slice(0, maxResults)), {
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    // Cache miss or not enough results — call Google Places API
    const googleApiKey = Deno.env.get('GOOGLE_PLACES_API_KEY');
    if (!googleApiKey) {
      return new Response(JSON.stringify([]), {
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const googleRes = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': googleApiKey,
        'X-Goog-FieldMask':
          'places.id,places.displayName,places.formattedAddress,places.shortFormattedAddress,places.location,places.fuelOptions',
      },
      body: JSON.stringify({
        includedTypes: ['gas_station'],
        maxResultCount: maxResults,
        locationRestriction: {
          circle: {
            center: { latitude, longitude },
            radius: radiusM,
          },
        },
      }),
    });

    if (!googleRes.ok) {
      return new Response(JSON.stringify([]), {
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const data = await googleRes.json();
    if (!data.places || !Array.isArray(data.places)) {
      return new Response(JSON.stringify([]), {
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    // Get the caller's user ID from the auth header (for reported_by)
    const authHeader = req.headers.get('Authorization');
    let userId: string | null = null;
    if (authHeader) {
      const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user } } = await userClient.auth.getUser();
      userId = user?.id ?? null;
    }

    const stations: GasStation[] = data.places.map((place: any) => ({
      placeId: place.id,
      name: place.displayName?.text ?? 'Unknown Station',
      address: place.shortFormattedAddress ?? place.formattedAddress ?? '',
      latitude: place.location?.latitude ?? 0,
      longitude: place.location?.longitude ?? 0,
      distanceM: haversineDistance(
        latitude,
        longitude,
        place.location?.latitude ?? 0,
        place.location?.longitude ?? 0,
      ),
      fuelPrices: parseFuelPrices(place.fuelOptions),
    }));

    // Upsert prices into station_prices cache
    const upsertRows: any[] = [];
    for (const station of stations) {
      for (const fp of station.fuelPrices) {
        upsertRows.push({
          place_id: station.placeId,
          fuel_grade: fp.fuelGrade,
          price_value: fp.priceValue,
          currency_code: fp.currencyCode,
          station_name: station.name,
          station_address: station.address,
          latitude: station.latitude,
          longitude: station.longitude,
          source_updated_at: fp.updatedAt,
          reported_by: userId,
          updated_at: new Date().toISOString(),
        });
      }
    }

    if (upsertRows.length > 0) {
      await supabase
        .from('station_prices')
        .upsert(upsertRows, { onConflict: 'place_id,fuel_grade' });
    }

    stations.sort((a, b) => a.distanceM - b.distanceM);
    return new Response(JSON.stringify(stations), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  } catch {
    return new Response(JSON.stringify([]), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
});

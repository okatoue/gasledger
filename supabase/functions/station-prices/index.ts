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
  fuelType: string;
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
      fuelType: grade,
      priceValue: value,
      currencyCode,
      updatedAt: fp.updateTime ?? null,
    });
  }
  return prices;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  try {
    const { placeId } = await req.json();

    if (!placeId || typeof placeId !== 'string') {
      return new Response(JSON.stringify({ error: 'placeId is required' }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const freshThreshold = new Date(Date.now() - STALE_MINUTES * 60 * 1000).toISOString();

    // Check cache for fresh prices
    const { data: cached } = await supabase
      .from('station_prices')
      .select('*')
      .eq('place_id', placeId)
      .gte('updated_at', freshThreshold);

    if (cached && cached.length > 0) {
      const first = cached[0];
      const station: GasStation = {
        placeId,
        name: first.station_name ?? 'Unknown Station',
        address: first.station_address ?? '',
        latitude: Number(first.latitude),
        longitude: Number(first.longitude),
        distanceM: 0,
        fuelPrices: cached.map((r: any) => ({
          fuelType: r.fuel_type,
          priceValue: Number(r.price_value),
          currencyCode: r.currency_code,
          updatedAt: r.source_updated_at,
        })),
      };
      return new Response(JSON.stringify(station), {
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    // Cache miss — call Google Places API
    const googleApiKey = Deno.env.get('GOOGLE_PLACES_API_KEY');
    if (!googleApiKey) {
      return new Response(JSON.stringify(null), {
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const googleRes = await fetch(
      `https://places.googleapis.com/v1/places/${placeId}`,
      {
        method: 'GET',
        headers: {
          'X-Goog-Api-Key': googleApiKey,
          'X-Goog-FieldMask':
            'id,displayName,formattedAddress,shortFormattedAddress,location,fuelOptions',
        },
      },
    );

    if (!googleRes.ok) {
      return new Response(JSON.stringify(null), {
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const place = await googleRes.json();
    const fuelPrices = parseFuelPrices(place.fuelOptions);

    const station: GasStation = {
      placeId: place.id,
      name: place.displayName?.text ?? 'Unknown Station',
      address: place.shortFormattedAddress ?? place.formattedAddress ?? '',
      latitude: place.location?.latitude ?? 0,
      longitude: place.location?.longitude ?? 0,
      distanceM: 0,
      fuelPrices,
    };

    // Get the caller's user ID from the auth header
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

    // Upsert prices into cache
    const upsertRows = fuelPrices.map((fp) => ({
      place_id: station.placeId,
      fuel_type: fp.fuelType,
      price_value: fp.priceValue,
      currency_code: fp.currencyCode,
      station_name: station.name,
      station_address: station.address,
      latitude: station.latitude,
      longitude: station.longitude,
      source_updated_at: fp.updatedAt,
      reported_by: userId,
      updated_at: new Date().toISOString(),
    }));

    if (upsertRows.length > 0) {
      await supabase
        .from('station_prices')
        .upsert(upsertRows, { onConflict: 'place_id,fuel_type' });
    }

    return new Response(JSON.stringify(station), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  } catch {
    return new Response(JSON.stringify(null), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
});

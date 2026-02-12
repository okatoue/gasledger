import { getDatabase } from '../database';
import * as Crypto from 'expo-crypto';
import type { StationFuelPrice } from '@/services/places/placesService';

export interface HomeStation {
  id: string;
  user_id: string;
  place_id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  cached_prices: StationFuelPrice[] | null;
  prices_updated_at: string | null;
  created_at: string;
  updated_at: string;
}

interface HomeStationRow {
  id: string;
  user_id: string;
  place_id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  cached_prices: string | null;
  prices_updated_at: string | null;
  created_at: string;
  updated_at: string;
}

function rowToHomeStation(row: HomeStationRow): HomeStation {
  return {
    ...row,
    cached_prices: row.cached_prices ? JSON.parse(row.cached_prices) : null,
  };
}

export const homeStationRepository = {
  async get(userId: string): Promise<HomeStation | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<HomeStationRow>(
      'SELECT * FROM home_stations WHERE user_id = ?',
      [userId],
    );
    return row ? rowToHomeStation(row) : null;
  },

  async upsert(
    userId: string,
    station: { placeId: string; name: string; address: string; latitude: number; longitude: number; fuelPrices: StationFuelPrice[] },
  ): Promise<void> {
    const db = await getDatabase();
    const id = Crypto.randomUUID();
    const now = new Date().toISOString();
    await db.runAsync(
      `INSERT INTO home_stations (id, user_id, place_id, name, address, latitude, longitude, cached_prices, prices_updated_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET
         place_id = excluded.place_id,
         name = excluded.name,
         address = excluded.address,
         latitude = excluded.latitude,
         longitude = excluded.longitude,
         cached_prices = excluded.cached_prices,
         prices_updated_at = excluded.prices_updated_at,
         updated_at = excluded.updated_at`,
      [
        id,
        userId,
        station.placeId,
        station.name,
        station.address,
        station.latitude,
        station.longitude,
        JSON.stringify(station.fuelPrices),
        now,
        now,
        now,
      ],
    );
  },

  async updateCachedPrices(userId: string, prices: StationFuelPrice[]): Promise<void> {
    const db = await getDatabase();
    const now = new Date().toISOString();
    await db.runAsync(
      'UPDATE home_stations SET cached_prices = ?, prices_updated_at = ?, updated_at = ? WHERE user_id = ?',
      [JSON.stringify(prices), now, now, userId],
    );
  },

  async remove(userId: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM home_stations WHERE user_id = ?', [userId]);
  },
};

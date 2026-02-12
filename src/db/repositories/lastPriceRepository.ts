import { getDatabase } from '../database';
import * as Crypto from 'expo-crypto';

export interface LastPrice {
  id: string;
  vehicle_id: string;
  fuel_grade: string;
  price_value: number;
  price_unit: string;
  price_currency: string;
  updated_at: string;
}

export const lastPriceRepository = {
  async get(vehicleId: string, fuelGrade: string): Promise<LastPrice | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<LastPrice>(
      'SELECT * FROM last_prices WHERE vehicle_id = ? AND fuel_grade = ?',
      [vehicleId, fuelGrade],
    );
    return row ?? null;
  },

  async upsert(
    vehicleId: string,
    fuelGrade: string,
    priceValue: number,
    priceUnit: string,
    priceCurrency: string,
  ): Promise<void> {
    const db = await getDatabase();
    const id = Crypto.randomUUID();
    const now = new Date().toISOString();
    await db.runAsync(
      `INSERT INTO last_prices (id, vehicle_id, fuel_grade, price_value, price_unit, price_currency, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(vehicle_id, fuel_grade) DO UPDATE SET
         price_value = excluded.price_value,
         price_unit = excluded.price_unit,
         price_currency = excluded.price_currency,
         updated_at = excluded.updated_at`,
      [id, vehicleId, fuelGrade, priceValue, priceUnit, priceCurrency, now],
    );
  },
};

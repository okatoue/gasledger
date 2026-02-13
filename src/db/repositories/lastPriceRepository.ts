import { getDatabase } from '../database';
import * as Crypto from 'expo-crypto';

export interface LastPrice {
  id: string;
  fuel_type: string;
  price_value: number;
  price_unit: string;
  price_currency: string;
  updated_at: string;
}

export const lastPriceRepository = {
  async get(fuelType: string): Promise<LastPrice | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<LastPrice>(
      'SELECT * FROM last_prices WHERE fuel_type = ?',
      [fuelType],
    );
    return row ?? null;
  },

  async upsert(
    fuelType: string,
    priceValue: number,
    priceUnit: string,
    priceCurrency: string,
  ): Promise<void> {
    const db = await getDatabase();
    const id = Crypto.randomUUID();
    const now = new Date().toISOString();
    await db.runAsync(
      `INSERT INTO last_prices (id, fuel_type, price_value, price_unit, price_currency, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(fuel_type) DO UPDATE SET
         price_value = excluded.price_value,
         price_unit = excluded.price_unit,
         price_currency = excluded.price_currency,
         updated_at = excluded.updated_at`,
      [id, fuelType, priceValue, priceUnit, priceCurrency, now],
    );
  },
};

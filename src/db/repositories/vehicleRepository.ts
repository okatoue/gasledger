import { getDatabase } from '../database';
import * as Crypto from 'expo-crypto';

export interface CreateVehicleInput {
  userId: string;
  vin?: string;
  make: string;
  model: string;
  year: number;
  fuelType?: string;
  efficiencyValue?: number;
  efficiencyUnit?: string;
  efficiencySource?: string;
}

export const vehicleRepository = {
  async countByUser(userId: string): Promise<number> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM vehicles WHERE user_id = ?',
      [userId],
    );
    return row?.count ?? 0;
  },

  async create(input: CreateVehicleInput): Promise<string> {
    const db = await getDatabase();
    const id = Crypto.randomUUID();
    const now = new Date().toISOString();

    await db.runAsync(
      `INSERT INTO vehicles (id, user_id, vin, make, model, year, fuel_type, efficiency_value, efficiency_unit, efficiency_source, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
      [
        id,
        input.userId,
        input.vin ?? null,
        input.make,
        input.model,
        input.year,
        input.fuelType ?? 'regular',
        input.efficiencyValue ?? 0,
        input.efficiencyUnit ?? 'mpg',
        input.efficiencySource ?? 'manual',
        now,
        now,
      ],
    );

    return id;
  },
};

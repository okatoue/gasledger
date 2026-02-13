import { getDatabase } from '../database';
import * as Crypto from 'expo-crypto';
import type { Vehicle } from '@/services/vehicle/vehicleService';

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

interface VehicleRow {
  id: string;
  user_id: string;
  vin: string | null;
  make: string;
  model: string;
  year: number;
  fuel_type: string;
  efficiency_value: number;
  efficiency_unit: string;
  efficiency_source: string;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export const vehicleRepository = {
  async getByUser(userId: string): Promise<Vehicle[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<VehicleRow>(
      'SELECT * FROM vehicles WHERE user_id = ? ORDER BY created_at DESC',
      [userId],
    );
    return rows.map((r) => ({ ...r, is_active: r.is_active === 1 }));
  },

  async upsertAll(userId: string, vehicles: Vehicle[]): Promise<void> {
    const db = await getDatabase();
    await db.withTransactionAsync(async () => {
      await db.runAsync('DELETE FROM vehicles WHERE user_id = ?', [userId]);
      for (const v of vehicles) {
        await db.runAsync(
          `INSERT INTO vehicles (id, user_id, vin, make, model, year, fuel_type, efficiency_value, efficiency_unit, efficiency_source, is_active, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            v.id,
            v.user_id,
            v.vin,
            v.make,
            v.model,
            v.year,
            v.fuel_type,
            v.efficiency_value,
            v.efficiency_unit,
            v.efficiency_source,
            v.is_active ? 1 : 0,
            v.created_at,
            v.updated_at,
          ],
        );
      }
    });
  },

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

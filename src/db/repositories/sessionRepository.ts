import { getDatabase } from '../database';
import * as Crypto from 'expo-crypto';

export interface CreateSessionInput {
  userId: string;
  vehicleId: string;
  fuelType: string;
  gasPriceValue: number;
  gasPriceUnit: string;
  gasPriceCurrency: string;
  routeEnabled: boolean;
}

export interface Session {
  id: string;
  user_id: string;
  vehicle_id: string;
  started_at_user: string;
  started_at_tracking: string | null;
  ended_at_user: string | null;
  distance_m: number;
  stopped_seconds: number;
  fuel_type: string;
  gas_price_value: number | null;
  gas_price_unit: string | null;
  gas_price_currency: string | null;
  price_source: string | null;
  est_fuel_used: number | null;
  est_cost: number | null;
  route_enabled: number;
  route_points_count: number;
  notes: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export const sessionRepository = {
  async create(input: CreateSessionInput): Promise<string> {
    const db = await getDatabase();
    const id = Crypto.randomUUID();
    const now = new Date().toISOString();

    await db.runAsync(
      `INSERT INTO sessions (id, user_id, vehicle_id, started_at_user, distance_m, stopped_seconds, fuel_type, gas_price_value, gas_price_unit, gas_price_currency, price_source, route_enabled, route_points_count, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, 0, 0, ?, ?, ?, ?, 'manual', ?, 0, 'active', ?, ?)`,
      [
        id,
        input.userId,
        input.vehicleId,
        now,
        input.fuelType,
        input.gasPriceValue,
        input.gasPriceUnit,
        input.gasPriceCurrency,
        input.routeEnabled ? 1 : 0,
        now,
        now,
      ],
    );

    return id;
  },

  async setTrackingStarted(sessionId: string): Promise<void> {
    const db = await getDatabase();
    const now = new Date().toISOString();
    await db.runAsync(
      'UPDATE sessions SET started_at_tracking = ?, updated_at = ? WHERE id = ?',
      [now, now, sessionId],
    );
  },

  async updateTracking(
    sessionId: string,
    updates: { distanceM: number; stoppedSeconds: number; routePointsCount: number },
  ): Promise<void> {
    const db = await getDatabase();
    const now = new Date().toISOString();
    await db.runAsync(
      'UPDATE sessions SET distance_m = ?, stopped_seconds = ?, route_points_count = ?, updated_at = ? WHERE id = ?',
      [updates.distanceM, updates.stoppedSeconds, updates.routePointsCount, now, sessionId],
    );
  },

  async complete(
    sessionId: string,
    totals: {
      distanceM: number;
      stoppedSeconds: number;
      estFuelUsed: number;
      estCost: number;
      routePointsCount: number;
    },
  ): Promise<void> {
    const db = await getDatabase();
    const now = new Date().toISOString();
    await db.runAsync(
      `UPDATE sessions SET status = 'completed', ended_at_user = ?, distance_m = ?, stopped_seconds = ?, est_fuel_used = ?, est_cost = ?, route_points_count = ?, updated_at = ? WHERE id = ?`,
      [now, totals.distanceM, totals.stoppedSeconds, totals.estFuelUsed, totals.estCost, totals.routePointsCount, now, sessionId],
    );
  },

  async getById(sessionId: string): Promise<Session | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<Session>(
      'SELECT * FROM sessions WHERE id = ?',
      [sessionId],
    );
    return row ?? null;
  },

  async getActiveSession(): Promise<Session | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<Session>(
      "SELECT * FROM sessions WHERE status = 'active' LIMIT 1",
    );
    return row ?? null;
  },

  async getByUser(userId: string, limit = 50, offset = 0): Promise<Session[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<Session>(
      'SELECT * FROM sessions WHERE user_id = ? ORDER BY started_at_user DESC LIMIT ? OFFSET ?',
      [userId, limit, offset],
    );
    return rows;
  },

  async updateNotes(sessionId: string, notes: string): Promise<void> {
    const db = await getDatabase();
    const now = new Date().toISOString();
    await db.runAsync(
      'UPDATE sessions SET notes = ?, updated_at = ? WHERE id = ?',
      [notes, now, sessionId],
    );
  },

  async update(
    sessionId: string,
    updates: {
      vehicleId?: string;
      fuelType?: string;
      gasPriceValue?: number;
      gasPriceUnit?: string;
      notes?: string;
      estFuelUsed?: number;
      estCost?: number;
    },
  ): Promise<void> {
    const db = await getDatabase();
    const now = new Date().toISOString();
    const setClauses: string[] = [];
    const values: (string | number | null)[] = [];

    if (updates.vehicleId !== undefined) {
      setClauses.push('vehicle_id = ?');
      values.push(updates.vehicleId);
    }
    if (updates.fuelType !== undefined) {
      setClauses.push('fuel_type = ?');
      values.push(updates.fuelType);
    }
    if (updates.gasPriceValue !== undefined) {
      setClauses.push('gas_price_value = ?');
      values.push(updates.gasPriceValue);
    }
    if (updates.gasPriceUnit !== undefined) {
      setClauses.push('gas_price_unit = ?');
      values.push(updates.gasPriceUnit);
    }
    if (updates.notes !== undefined) {
      setClauses.push('notes = ?');
      values.push(updates.notes);
    }
    if (updates.estFuelUsed !== undefined) {
      setClauses.push('est_fuel_used = ?');
      values.push(updates.estFuelUsed);
    }
    if (updates.estCost !== undefined) {
      setClauses.push('est_cost = ?');
      values.push(updates.estCost);
    }

    if (setClauses.length === 0) return;

    setClauses.push('updated_at = ?');
    values.push(now);
    values.push(sessionId);

    await db.runAsync(
      `UPDATE sessions SET ${setClauses.join(', ')} WHERE id = ?`,
      values,
    );
  },

  async deleteSession(sessionId: string): Promise<void> {
    const db = await getDatabase();
    await db.withTransactionAsync(async () => {
      await db.runAsync('DELETE FROM route_points WHERE session_id = ?', [sessionId]);
      await db.runAsync('DELETE FROM tracking_gaps WHERE session_id = ?', [sessionId]);
      await db.runAsync('DELETE FROM sessions WHERE id = ?', [sessionId]);
    });
  },

  async getMonthlyStats(userId: string): Promise<{ totalSpend: number; totalDistanceM: number }> {
    const db = await getDatabase();
    const now = new Date();
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const row = await db.getFirstAsync<{ totalSpend: number; totalDistanceM: number }>(
      `SELECT COALESCE(SUM(est_cost), 0) as totalSpend, COALESCE(SUM(distance_m), 0) as totalDistanceM
       FROM sessions WHERE user_id = ? AND status = 'completed' AND started_at_user >= ?`,
      [userId, firstOfMonth],
    );
    return row ?? { totalSpend: 0, totalDistanceM: 0 };
  },

  async deleteAllByUser(userId: string): Promise<void> {
    const db = await getDatabase();
    await db.withTransactionAsync(async () => {
      await db.runAsync(
        'DELETE FROM route_points WHERE session_id IN (SELECT id FROM sessions WHERE user_id = ?)',
        [userId],
      );
      await db.runAsync(
        'DELETE FROM tracking_gaps WHERE session_id IN (SELECT id FROM sessions WHERE user_id = ?)',
        [userId],
      );
      await db.runAsync('DELETE FROM sessions WHERE user_id = ?', [userId]);
    });
  },
};

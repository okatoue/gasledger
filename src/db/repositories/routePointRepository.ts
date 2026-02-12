import { getDatabase } from '../database';
import * as Crypto from 'expo-crypto';

export interface RoutePoint {
  id: string;
  session_id: string;
  timestamp: string;
  latitude: number;
  longitude: number;
  accuracy_m: number | null;
  speed_mps: number | null;
}

interface AcceptedPoint {
  latitude: number;
  longitude: number;
  accuracy_m: number;
  speed_mps: number | null;
  timestamp: number;
}

export const routePointRepository = {
  async insertBatch(sessionId: string, points: AcceptedPoint[]): Promise<void> {
    if (points.length === 0) return;
    const db = await getDatabase();
    await db.withTransactionAsync(async () => {
      for (const point of points) {
        await db.runAsync(
          'INSERT INTO route_points (id, session_id, timestamp, latitude, longitude, accuracy_m, speed_mps) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [
            Crypto.randomUUID(),
            sessionId,
            new Date(point.timestamp).toISOString(),
            point.latitude,
            point.longitude,
            point.accuracy_m,
            point.speed_mps,
          ],
        );
      }
    });
  },

  async getBySession(sessionId: string): Promise<RoutePoint[]> {
    const db = await getDatabase();
    return db.getAllAsync<RoutePoint>(
      'SELECT * FROM route_points WHERE session_id = ? ORDER BY timestamp ASC',
      [sessionId],
    );
  },

  async deleteBySession(sessionId: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM route_points WHERE session_id = ?', [sessionId]);
  },

  async deleteAllByUser(userId: string): Promise<void> {
    const db = await getDatabase();
    await db.withTransactionAsync(async () => {
      await db.runAsync(
        'DELETE FROM route_points WHERE session_id IN (SELECT id FROM sessions WHERE user_id = ?)',
        [userId],
      );
      await db.runAsync(
        `UPDATE sessions SET route_points_count = 0, updated_at = ? WHERE user_id = ?`,
        [new Date().toISOString(), userId],
      );
    });
  },
};

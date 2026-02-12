import { getDatabase } from '../database';
import * as Crypto from 'expo-crypto';

export interface TrackingGap {
  id: string;
  session_id: string;
  started_at: string;
  ended_at: string | null;
  reason: string | null;
}

export const trackingGapRepository = {
  async startGap(sessionId: string, startedAt: string, reason: string): Promise<string> {
    const db = await getDatabase();
    const id = Crypto.randomUUID();
    await db.runAsync(
      'INSERT INTO tracking_gaps (id, session_id, started_at, reason) VALUES (?, ?, ?, ?)',
      [id, sessionId, startedAt, reason],
    );
    return id;
  },

  async endGap(gapId: string, endedAt: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      'UPDATE tracking_gaps SET ended_at = ? WHERE id = ?',
      [endedAt, gapId],
    );
  },

  async getBySession(sessionId: string): Promise<TrackingGap[]> {
    const db = await getDatabase();
    return db.getAllAsync<TrackingGap>(
      'SELECT * FROM tracking_gaps WHERE session_id = ? ORDER BY started_at ASC',
      [sessionId],
    );
  },
};

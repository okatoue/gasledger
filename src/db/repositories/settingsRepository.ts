import { getDatabase } from '../database';

export interface UserSettings {
  distance_unit: 'mi' | 'km';
  volume_unit: 'gal' | 'l';
  currency: string;
  route_storage_enabled: number;
}

export const settingsRepository = {
  async get(userId: string): Promise<UserSettings | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<UserSettings>(
      'SELECT distance_unit, volume_unit, currency, route_storage_enabled FROM users WHERE id = ?',
      [userId],
    );
    return row ?? null;
  },

  async upsert(userId: string, settings: Partial<UserSettings>): Promise<void> {
    const db = await getDatabase();
    const now = new Date().toISOString();

    const existing = await db.getFirstAsync<{ id: string }>(
      'SELECT id FROM users WHERE id = ?',
      [userId],
    );

    if (existing) {
      const setClauses: string[] = [];
      const values: (string | number | null)[] = [];

      if (settings.distance_unit !== undefined) {
        setClauses.push('distance_unit = ?');
        values.push(settings.distance_unit);
      }
      if (settings.volume_unit !== undefined) {
        setClauses.push('volume_unit = ?');
        values.push(settings.volume_unit);
      }
      if (settings.currency !== undefined) {
        setClauses.push('currency = ?');
        values.push(settings.currency);
      }
      if (settings.route_storage_enabled !== undefined) {
        setClauses.push('route_storage_enabled = ?');
        values.push(settings.route_storage_enabled);
      }

      if (setClauses.length === 0) return;

      setClauses.push('updated_at = ?');
      values.push(now);
      values.push(userId);

      await db.runAsync(
        `UPDATE users SET ${setClauses.join(', ')} WHERE id = ?`,
        values,
      );
    } else {
      await db.runAsync(
        `INSERT INTO users (id, auth_provider, distance_unit, volume_unit, currency, route_storage_enabled, created_at, updated_at)
         VALUES (?, 'supabase', ?, ?, ?, ?, ?, ?)`,
        [
          userId,
          settings.distance_unit ?? 'mi',
          settings.volume_unit ?? 'gal',
          settings.currency ?? 'usd',
          settings.route_storage_enabled ?? 1,
          now,
          now,
        ],
      );
    }
  },
};

import { getDatabase } from '../database';

export const userRepository = {
  async ensureExists(userId: string, authProvider: string = 'email'): Promise<void> {
    const db = await getDatabase();
    const now = new Date().toISOString();
    await db.runAsync(
      `INSERT OR IGNORE INTO users (id, auth_provider, created_at, updated_at) VALUES (?, ?, ?, ?)`,
      [userId, authProvider, now, now],
    );
  },
};

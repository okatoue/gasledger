import { getDatabase } from '@/db/database';

export interface SyncQueueEntry {
  id: number;
  table_name: string;
  record_id: string;
  action: string;
  created_at: string;
}

export const syncQueue = {
  async enqueue(tableName: string, recordId: string, action: string): Promise<void> {
    const db = await getDatabase();
    // De-duplicate: remove any existing entry for same table+record, keep only latest action
    await db.runAsync(
      'DELETE FROM sync_queue WHERE table_name = ? AND record_id = ?',
      [tableName, recordId],
    );
    await db.runAsync(
      'INSERT INTO sync_queue (table_name, record_id, action, created_at) VALUES (?, ?, ?, ?)',
      [tableName, recordId, action, new Date().toISOString()],
    );
  },

  async getAll(): Promise<SyncQueueEntry[]> {
    const db = await getDatabase();
    return db.getAllAsync<SyncQueueEntry>(
      'SELECT * FROM sync_queue ORDER BY id ASC',
    );
  },

  async remove(id: number): Promise<void> {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM sync_queue WHERE id = ?', [id]);
  },

  async clear(): Promise<void> {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM sync_queue');
  },
};

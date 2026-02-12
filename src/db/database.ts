import * as SQLite from 'expo-sqlite';
import { CREATE_TABLES_SQL, CREATE_INDEXES_SQL, DB_VERSION } from './schema';

let db: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;
  db = await SQLite.openDatabaseAsync('gasledger.db');
  await initDatabase(db);
  return db;
}

async function initDatabase(database: SQLite.SQLiteDatabase): Promise<void> {
  await database.execAsync('PRAGMA journal_mode = WAL;');
  // FK enforcement disabled: vehicles live in Supabase, not local SQLite,
  // so sessions.vehicle_id cannot satisfy a local FK constraint.
  await database.execAsync('PRAGMA foreign_keys = OFF;');

  for (const sql of CREATE_TABLES_SQL) {
    await database.execAsync(sql);
  }
  for (const sql of CREATE_INDEXES_SQL) {
    await database.execAsync(sql);
  }

  console.log(`[DB] Database initialized (version ${DB_VERSION})`);
}

export async function closeDatabase(): Promise<void> {
  if (db) {
    await db.closeAsync();
    db = null;
  }
}

export async function deleteDatabase(): Promise<void> {
  if (db) {
    await db.closeAsync();
    db = null;
  }
  await SQLite.deleteDatabaseAsync('gasledger.db');
}

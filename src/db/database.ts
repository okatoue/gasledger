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

  // Check current DB version and run migrations
  const versionRow = await database.getFirstAsync<{ user_version: number }>(
    'PRAGMA user_version',
  );
  const currentVersion = versionRow?.user_version ?? 0;

  if (currentVersion < 2) {
    await migrateV1toV2(database);
  }
  if (currentVersion < 3) {
    await migrateV2toV3(database);
  }

  console.log(`[DB] Database initialized (version ${DB_VERSION})`);
}

/**
 * Migration v1 → v2: Merge fuel_type and fuel_grade into single fuel_type field.
 * Uses table-recreate pattern for SQLite compatibility.
 */
async function migrateV1toV2(database: SQLite.SQLiteDatabase): Promise<void> {
  console.log('[DB] Running migration v1 → v2: merge fuel_type/fuel_grade');

  // Each step checks column existence first, so the migration is idempotent
  // and safe to re-run if interrupted partway through.

  // 1. Vehicles: remove default_fuel_grade, remap fuel_type
  const vehicleCols = await database.getAllAsync<{ name: string }>(
    "PRAGMA table_info(vehicles)",
  );
  const hasDefaultFuelGrade = vehicleCols.some((c) => c.name === 'default_fuel_grade');

  if (hasDefaultFuelGrade) {
    await database.execAsync(`
      CREATE TABLE vehicles_new (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id),
        vin TEXT,
        make TEXT NOT NULL,
        model TEXT NOT NULL,
        year INTEGER NOT NULL,
        fuel_type TEXT NOT NULL,
        efficiency_value REAL NOT NULL,
        efficiency_unit TEXT NOT NULL,
        efficiency_source TEXT NOT NULL,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      INSERT INTO vehicles_new (id, user_id, vin, make, model, year, fuel_type, efficiency_value, efficiency_unit, efficiency_source, is_active, created_at, updated_at)
      SELECT id, user_id, vin, make, model, year,
        COALESCE(NULLIF(default_fuel_grade, ''), CASE fuel_type WHEN 'diesel' THEN 'diesel' ELSE 'regular' END),
        efficiency_value, efficiency_unit, efficiency_source, is_active, created_at, updated_at
      FROM vehicles;
      DROP TABLE vehicles;
      ALTER TABLE vehicles_new RENAME TO vehicles;
      CREATE INDEX IF NOT EXISTS idx_vehicles_user_id ON vehicles(user_id);
    `);
  }

  // 2. Sessions: rename fuel_grade → fuel_type
  const sessionCols = await database.getAllAsync<{ name: string }>(
    "PRAGMA table_info(sessions)",
  );
  const hasFuelGradeSession = sessionCols.some((c) => c.name === 'fuel_grade');

  if (hasFuelGradeSession) {
    await database.execAsync(`
      CREATE TABLE sessions_new (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id),
        vehicle_id TEXT NOT NULL REFERENCES vehicles(id),
        started_at_user TEXT NOT NULL,
        started_at_tracking TEXT,
        ended_at_user TEXT,
        distance_m REAL NOT NULL DEFAULT 0,
        stopped_seconds REAL NOT NULL DEFAULT 0,
        fuel_type TEXT NOT NULL,
        gas_price_value REAL,
        gas_price_unit TEXT,
        gas_price_currency TEXT,
        price_source TEXT,
        est_fuel_used REAL,
        est_cost REAL,
        route_enabled INTEGER NOT NULL DEFAULT 1,
        route_points_count INTEGER NOT NULL DEFAULT 0,
        notes TEXT,
        status TEXT NOT NULL DEFAULT 'active',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      INSERT INTO sessions_new (id, user_id, vehicle_id, started_at_user, started_at_tracking, ended_at_user, distance_m, stopped_seconds, fuel_type, gas_price_value, gas_price_unit, gas_price_currency, price_source, est_fuel_used, est_cost, route_enabled, route_points_count, notes, status, created_at, updated_at)
      SELECT id, user_id, vehicle_id, started_at_user, started_at_tracking, ended_at_user, distance_m, stopped_seconds, fuel_grade, gas_price_value, gas_price_unit, gas_price_currency, price_source, est_fuel_used, est_cost, route_enabled, route_points_count, notes, status, created_at, updated_at
      FROM sessions;
      DROP TABLE sessions;
      ALTER TABLE sessions_new RENAME TO sessions;
      CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
      CREATE INDEX IF NOT EXISTS idx_sessions_vehicle_id ON sessions(vehicle_id);
    `);
  }

  // 3. Last prices: rename fuel_grade → fuel_type
  const lpCols = await database.getAllAsync<{ name: string }>(
    "PRAGMA table_info(last_prices)",
  );
  const hasFuelGradeLP = lpCols.some((c) => c.name === 'fuel_grade');

  if (hasFuelGradeLP) {
    await database.execAsync(`
      CREATE TABLE last_prices_new (
        id TEXT PRIMARY KEY,
        vehicle_id TEXT NOT NULL REFERENCES vehicles(id),
        fuel_type TEXT NOT NULL,
        price_value REAL NOT NULL,
        price_unit TEXT NOT NULL,
        price_currency TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE(vehicle_id, fuel_type)
      );
      INSERT INTO last_prices_new (id, vehicle_id, fuel_type, price_value, price_unit, price_currency, updated_at)
      SELECT id, vehicle_id, fuel_grade, price_value, price_unit, price_currency, updated_at
      FROM last_prices;
      DROP TABLE last_prices;
      ALTER TABLE last_prices_new RENAME TO last_prices;
      CREATE INDEX IF NOT EXISTS idx_last_prices_vehicle_id ON last_prices(vehicle_id);
    `);
  }

  // 4. Clear cached home station prices (stale JSON with fuelGrade keys)
  await database.execAsync('UPDATE home_stations SET cached_prices = NULL WHERE cached_prices IS NOT NULL;');

  // 5. Set user_version
  await database.execAsync('PRAGMA user_version = 2;');

  console.log('[DB] Migration v1 → v2 complete');
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

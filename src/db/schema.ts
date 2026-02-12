export const DB_VERSION = 1;

export const CREATE_TABLES_SQL: string[] = [
  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    auth_provider TEXT NOT NULL,
    distance_unit TEXT NOT NULL DEFAULT 'mi',
    volume_unit TEXT NOT NULL DEFAULT 'gal',
    currency TEXT NOT NULL DEFAULT 'usd',
    route_storage_enabled INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );`,

  `CREATE TABLE IF NOT EXISTS vehicles (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    vin TEXT,
    make TEXT NOT NULL,
    model TEXT NOT NULL,
    year INTEGER NOT NULL,
    fuel_type TEXT NOT NULL,
    default_fuel_grade TEXT NOT NULL,
    efficiency_value REAL NOT NULL,
    efficiency_unit TEXT NOT NULL,
    efficiency_source TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );`,

  `CREATE TABLE IF NOT EXISTS last_prices (
    id TEXT PRIMARY KEY,
    vehicle_id TEXT NOT NULL REFERENCES vehicles(id),
    fuel_grade TEXT NOT NULL,
    price_value REAL NOT NULL,
    price_unit TEXT NOT NULL,
    price_currency TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE(vehicle_id, fuel_grade)
  );`,

  `CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    vehicle_id TEXT NOT NULL REFERENCES vehicles(id),
    started_at_user TEXT NOT NULL,
    started_at_tracking TEXT,
    ended_at_user TEXT,
    distance_m REAL NOT NULL DEFAULT 0,
    stopped_seconds REAL NOT NULL DEFAULT 0,
    fuel_grade TEXT NOT NULL,
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
  );`,

  `CREATE TABLE IF NOT EXISTS tracking_gaps (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL REFERENCES sessions(id),
    started_at TEXT NOT NULL,
    ended_at TEXT,
    reason TEXT
  );`,

  `CREATE TABLE IF NOT EXISTS route_points (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL REFERENCES sessions(id),
    timestamp TEXT NOT NULL,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    accuracy_m REAL,
    speed_mps REAL
  );`,
];

export const CREATE_INDEXES_SQL: string[] = [
  `CREATE INDEX IF NOT EXISTS idx_vehicles_user_id ON vehicles(user_id);`,
  `CREATE INDEX IF NOT EXISTS idx_last_prices_vehicle_id ON last_prices(vehicle_id);`,
  `CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);`,
  `CREATE INDEX IF NOT EXISTS idx_sessions_vehicle_id ON sessions(vehicle_id);`,
  `CREATE INDEX IF NOT EXISTS idx_tracking_gaps_session_id ON tracking_gaps(session_id);`,
  `CREATE INDEX IF NOT EXISTS idx_route_points_session_id ON route_points(session_id);`,
  `CREATE INDEX IF NOT EXISTS idx_route_points_timestamp ON route_points(timestamp);`,
];

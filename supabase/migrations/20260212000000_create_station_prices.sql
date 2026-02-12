-- Shared gas station price cache
CREATE TABLE station_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id TEXT NOT NULL,
  fuel_grade TEXT NOT NULL,
  price_value NUMERIC NOT NULL,
  currency_code TEXT NOT NULL DEFAULT 'USD',
  station_name TEXT,
  station_address TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  source_updated_at TIMESTAMPTZ,
  reported_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(place_id, fuel_grade)
);

CREATE INDEX idx_station_prices_place_id ON station_prices(place_id);
CREATE INDEX idx_station_prices_location ON station_prices(latitude, longitude);

ALTER TABLE station_prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read all prices"
  ON station_prices FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert prices"
  ON station_prices FOR INSERT TO authenticated
  WITH CHECK (reported_by = auth.uid());

CREATE POLICY "Authenticated users can update prices"
  ON station_prices FOR UPDATE TO authenticated USING (true);

-- vehicles: merge default_fuel_grade into fuel_type, drop default_fuel_grade
ALTER TABLE vehicles ADD COLUMN fuel_type_new TEXT;
UPDATE vehicles SET fuel_type_new = COALESCE(NULLIF(default_fuel_grade, ''),
  CASE fuel_type WHEN 'diesel' THEN 'diesel' ELSE 'regular' END);
ALTER TABLE vehicles DROP COLUMN default_fuel_grade;
ALTER TABLE vehicles DROP COLUMN fuel_type;
ALTER TABLE vehicles RENAME COLUMN fuel_type_new TO fuel_type;
ALTER TABLE vehicles ALTER COLUMN fuel_type SET NOT NULL;
ALTER TABLE vehicles ALTER COLUMN fuel_type SET DEFAULT 'regular';

-- sessions: rename fuel_grade → fuel_type
ALTER TABLE sessions RENAME COLUMN fuel_grade TO fuel_type;

-- station_prices: rename fuel_grade → fuel_type + fix constraint
ALTER TABLE station_prices RENAME COLUMN fuel_grade TO fuel_type;
ALTER TABLE station_prices DROP CONSTRAINT IF EXISTS station_prices_place_id_fuel_grade_key;
ALTER TABLE station_prices ADD CONSTRAINT station_prices_place_id_fuel_type_key UNIQUE(place_id, fuel_type);

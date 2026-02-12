import { FuelGrade, PriceSource, SessionStatus } from '@/models/enums';
import { Currency } from '@/models/units';

export interface Session {
  id: string;
  user_id: string;
  vehicle_id: string;
  started_at_user: string;
  started_at_tracking: string;
  ended_at_user?: string;
  distance_m: number;
  stopped_seconds: number;
  fuel_grade: FuelGrade;
  gas_price_value: number;
  gas_price_unit: string;
  gas_price_currency: Currency;
  price_source: PriceSource;
  est_fuel_used: number;
  est_cost: number;
  route_enabled: boolean;
  route_points_count: number;
  notes?: string;
  status: SessionStatus;
  created_at: string;
  updated_at: string;
}

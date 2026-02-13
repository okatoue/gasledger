import { EfficiencySource, EfficiencyUnit, FuelType } from '@/models/enums';

export interface Vehicle {
  id: string;
  user_id: string;
  vin?: string;
  make: string;
  model: string;
  year: number;
  fuel_type: FuelType;
  efficiency_value: number;
  efficiency_unit: EfficiencyUnit;
  efficiency_source: EfficiencySource;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

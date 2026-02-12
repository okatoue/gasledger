import { AuthProvider } from '@/models/enums';
import { Currency, DistanceUnit, VolumeUnit } from '@/models/units';

export interface User {
  id: string;
  auth_provider: AuthProvider;
  distance_unit: DistanceUnit;
  volume_unit: VolumeUnit;
  currency: Currency;
  route_storage_enabled: boolean;
  created_at: string;
  updated_at: string;
}

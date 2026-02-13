export interface VinResult {
  make: string;
  model: string;
  year: number;
  fuelType: string;
}

const NHTSA_URL = 'https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues';

interface NHTSAVariable {
  Make: string;
  Model: string;
  ModelYear: string;
  FuelTypePrimary: string;
  ErrorCode: string;
  ErrorText: string;
}

function normalizeFuelType(raw: string): string {
  const lower = raw.toLowerCase();
  if (lower.includes('diesel')) return 'diesel';
  return 'regular';
}

export async function decodeVin(vin: string): Promise<VinResult | null> {
  const res = await fetch(`${NHTSA_URL}/${vin}?format=json`);
  if (!res.ok) return null;

  const json = await res.json();
  const result: NHTSAVariable | undefined = json.Results?.[0];
  if (!result) return null;

  // ErrorCode "0" means no errors; anything with only "0" is a clean decode
  if (!result.Make || !result.Model || !result.ModelYear) return null;

  const year = parseInt(result.ModelYear, 10);
  if (isNaN(year)) return null;

  return {
    make: result.Make,
    model: result.Model,
    year,
    fuelType: normalizeFuelType(result.FuelTypePrimary ?? ''),
  };
}

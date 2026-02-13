const BASE_URL = 'https://www.fueleconomy.gov/ws/rest/vehicle';

export interface MenuItem {
  text: string;
  value: string;
}

export interface VehicleDetails {
  id: string;
  make: string;
  model: string;
  year: number;
  comb08: number;
  highway08: number;
  city08: number;
  fuelType1: string;
  trany: string;
  cylinders: number;
  displ: number;
}

export function parseMenuItems(xml: string): MenuItem[] {
  const items: MenuItem[] = [];
  const regex = /<menuItem>\s*<text>(.*?)<\/text>\s*<value>(.*?)<\/value>\s*<\/menuItem>/gs;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(xml)) !== null) {
    items.push({ text: match[1], value: match[2] });
  }
  return items;
}

function extractTag(xml: string, tag: string): string {
  const match = xml.match(new RegExp(`<${tag}>(.*?)</${tag}>`, 's'));
  return match ? match[1].trim() : '';
}

export function parseVehicleDetails(xml: string): VehicleDetails | null {
  const id = extractTag(xml, 'id');
  const make = extractTag(xml, 'make');
  const model = extractTag(xml, 'model');
  if (!id || !make || !model) return null;

  return {
    id,
    make,
    model,
    year: parseInt(extractTag(xml, 'year'), 10) || 0,
    comb08: parseInt(extractTag(xml, 'comb08'), 10) || 0,
    highway08: parseInt(extractTag(xml, 'highway08'), 10) || 0,
    city08: parseInt(extractTag(xml, 'city08'), 10) || 0,
    fuelType1: extractTag(xml, 'fuelType1'),
    trany: extractTag(xml, 'trany'),
    cylinders: parseInt(extractTag(xml, 'cylinders'), 10) || 0,
    displ: parseFloat(extractTag(xml, 'displ')) || 0,
  };
}

export async function fetchMakes(year: string): Promise<MenuItem[]> {
  const res = await fetch(`${BASE_URL}/menu/make?year=${encodeURIComponent(year)}`);
  if (!res.ok) throw new Error(`Failed to fetch makes: ${res.status}`);
  const xml = await res.text();
  return parseMenuItems(xml);
}

export async function fetchModels(year: string, make: string): Promise<MenuItem[]> {
  const res = await fetch(
    `${BASE_URL}/menu/model?year=${encodeURIComponent(year)}&make=${encodeURIComponent(make)}`,
  );
  if (!res.ok) throw new Error(`Failed to fetch models: ${res.status}`);
  const xml = await res.text();
  return parseMenuItems(xml);
}

export async function fetchOptions(year: string, make: string, model: string): Promise<MenuItem[]> {
  const res = await fetch(
    `${BASE_URL}/menu/options?year=${encodeURIComponent(year)}&make=${encodeURIComponent(make)}&model=${encodeURIComponent(model)}`,
  );
  if (!res.ok) throw new Error(`Failed to fetch options: ${res.status}`);
  const xml = await res.text();
  return parseMenuItems(xml);
}

export async function fetchVehicleDetails(vehicleId: string): Promise<VehicleDetails | null> {
  const res = await fetch(`${BASE_URL}/${encodeURIComponent(vehicleId)}`);
  if (!res.ok) throw new Error(`Failed to fetch vehicle details: ${res.status}`);
  const xml = await res.text();
  return parseVehicleDetails(xml);
}

export function normalizeFuelInfo(fuelType1: string): { fuelType: string } {
  const lower = fuelType1.toLowerCase();
  if (lower.includes('premium')) return { fuelType: 'premium' };
  if (lower.includes('midgrade')) return { fuelType: 'midgrade' };
  if (lower.includes('diesel')) return { fuelType: 'diesel' };
  return { fuelType: 'regular' };
}

import { getLocales } from 'expo-localization';

interface LocaleDefaults {
  distanceUnit: 'mi' | 'km';
  volumeUnit: 'gal' | 'l';
  currency: string;
}

// Countries that use miles
const MILE_COUNTRIES = new Set(['US', 'GB', 'MM', 'LR']);
// Countries that use gallons (US only for fuel)
const GALLON_COUNTRIES = new Set(['US']);

const CURRENCY_MAP: Record<string, string> = {
  US: 'usd',
  CA: 'cad',
};

export function getLocaleDefaults(): LocaleDefaults {
  try {
    const locales = getLocales();
    const region = locales[0]?.regionCode?.toUpperCase() ?? '';

    return {
      distanceUnit: MILE_COUNTRIES.has(region) ? 'mi' : 'km',
      volumeUnit: GALLON_COUNTRIES.has(region) ? 'gal' : 'l',
      currency: CURRENCY_MAP[region] ?? 'usd',
    };
  } catch {
    return { distanceUnit: 'mi', volumeUnit: 'gal', currency: 'usd' };
  }
}

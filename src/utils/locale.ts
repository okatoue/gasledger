// Locale utilities - to be implemented
export function getDefaultUnits(): { distanceUnit: string; volumeUnit: string; currency: string } {
  // TODO: detect from device locale
  return { distanceUnit: 'mi', volumeUnit: 'gal', currency: 'usd' };
}

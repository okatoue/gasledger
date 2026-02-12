const LITERS_PER_GALLON = 3.78541;
const KM_PER_MILE = 1.60934;

export function mpgToLPer100Km(mpg: number): number {
  return 235.215 / mpg;
}

export function lPer100KmToMpg(lPer100Km: number): number {
  return 235.215 / lPer100Km;
}

export function milesToKm(miles: number): number {
  return miles * KM_PER_MILE;
}

export function kmToMiles(km: number): number {
  return km / KM_PER_MILE;
}

export function gallonsToLiters(gallons: number): number {
  return gallons * LITERS_PER_GALLON;
}

export function litersToGallons(liters: number): number {
  return liters / LITERS_PER_GALLON;
}

export function metersToMiles(meters: number): number {
  return meters / 1609.344;
}

export function metersToKm(meters: number): number {
  return meters / 1000;
}

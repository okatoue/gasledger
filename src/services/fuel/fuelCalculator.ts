import { gallonsToLiters, litersToGallons } from './unitConverter';

export function calculateFuelUsed(distanceM: number, efficiencyValue: number, efficiencyUnit: string): number {
  if (efficiencyValue <= 0) return 0;

  if (efficiencyUnit === 'mpg') {
    const miles = distanceM / 1609.344;
    return miles / efficiencyValue; // gallons
  } else if (efficiencyUnit === 'l_per_100km') {
    const km = distanceM / 1000;
    return (km / 100) * efficiencyValue; // liters
  } else if (efficiencyUnit === 'km_per_l') {
    const km = distanceM / 1000;
    return km / efficiencyValue; // liters
  }
  return 0;
}

export function calculateCost(fuelUsed: number, pricePerUnit: number): number {
  return fuelUsed * pricePerUnit;
}

export function calculateTripCost(
  distanceM: number,
  efficiencyValue: number,
  efficiencyUnit: string,
  gasPrice: number,
  volumeUnit: 'gal' | 'l',
): number {
  const fuelUsed = calculateFuelUsed(distanceM, efficiencyValue, efficiencyUnit);
  if (fuelUsed <= 0) return 0;

  // calculateFuelUsed returns gallons for 'mpg', liters for 'l_per_100km'/'km_per_l'
  // Align fuel quantity unit with price unit
  if (efficiencyUnit === 'mpg') {
    // fuelUsed is in gallons
    if (volumeUnit === 'l') {
      // price is per liter — convert gallons to liters
      return gallonsToLiters(fuelUsed) * gasPrice;
    }
    return fuelUsed * gasPrice; // both gallons
  } else {
    // fuelUsed is in liters (l_per_100km or km_per_l)
    if (volumeUnit === 'gal') {
      // price is per gallon — convert liters to gallons
      return litersToGallons(fuelUsed) * gasPrice;
    }
    return fuelUsed * gasPrice; // both liters
  }
}

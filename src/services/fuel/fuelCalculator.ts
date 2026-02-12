export function calculateFuelUsed(distanceM: number, efficiencyValue: number, efficiencyUnit: string): number {
  if (efficiencyValue <= 0) return 0;

  if (efficiencyUnit === 'mpg') {
    const miles = distanceM / 1609.344;
    return miles / efficiencyValue; // gallons
  } else if (efficiencyUnit === 'l/100km') {
    const km = distanceM / 1000;
    return (km / 100) * efficiencyValue; // liters
  } else if (efficiencyUnit === 'km/l') {
    const km = distanceM / 1000;
    return km / efficiencyValue; // liters
  }
  return 0;
}

export function calculateCost(fuelUsed: number, pricePerUnit: number): number {
  return fuelUsed * pricePerUnit;
}

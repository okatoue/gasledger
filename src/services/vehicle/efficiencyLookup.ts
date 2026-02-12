import { fetchModels, fetchOptions, fetchVehicleDetails } from './fuelEconomyApi';

export async function lookupEfficiency(
  make: string,
  model: string,
  year: number,
): Promise<{ value: number; unit: string }[] | null> {
  try {
    const yearStr = String(year);
    const models = await fetchModels(yearStr, make);
    const matched = models.find(
      (m) => m.text.toLowerCase().startsWith(model.toLowerCase()),
    ) ?? models[0];
    if (!matched) return null;

    const options = await fetchOptions(yearStr, make, matched.value);
    if (options.length === 0) return null;

    const results: { value: number; unit: string }[] = [];
    for (const opt of options) {
      const details = await fetchVehicleDetails(opt.value);
      if (details && details.comb08 > 0) {
        results.push({ value: details.comb08, unit: 'mpg' });
      }
    }

    return results.length > 0 ? results : null;
  } catch {
    return null;
  }
}

import { useSettingsStore } from '@/stores/settingsStore';

export function useUnits() {
  const distanceUnit = useSettingsStore((s) => s.distanceUnit);
  const volumeUnit = useSettingsStore((s) => s.volumeUnit);
  const currency = useSettingsStore((s) => s.currency);
  return { distanceUnit, volumeUnit, currency };
}

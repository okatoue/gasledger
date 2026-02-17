import { useColorScheme } from 'react-native';
import { useSettingsStore } from '@/stores/settingsStore';
import { lightColors, darkColors, type Colors } from './colors';
export type { Colors };

export function useColors(): Colors {
  const colorScheme = useSettingsStore((s) => s.colorScheme);
  const systemScheme = useColorScheme();
  if (colorScheme === 'light') return lightColors;
  if (colorScheme === 'dark') return darkColors;
  return systemScheme === 'dark' ? darkColors : lightColors;
}

export function useIsDark(): boolean {
  const colorScheme = useSettingsStore((s) => s.colorScheme);
  const systemScheme = useColorScheme();
  if (colorScheme === 'light') return false;
  if (colorScheme === 'dark') return true;
  return systemScheme === 'dark';
}

import { Stack } from 'expo-router';
import { useColors } from '@/theme/useColors';

export default function SettingsLayout() {
  const colors = useColors();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Settings' }} />
      <Stack.Screen name="units" options={{ title: 'Units & Currency' }} />
      <Stack.Screen name="privacy" options={{ title: 'Privacy & Deletion' }} />
      <Stack.Screen name="export" options={{ title: 'Export' }} />
    </Stack>
  );
}

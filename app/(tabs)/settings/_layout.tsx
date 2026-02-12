import { Stack } from 'expo-router';

export default function SettingsLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Settings' }} />
      <Stack.Screen name="units" options={{ title: 'Units & Currency' }} />
      <Stack.Screen name="privacy" options={{ title: 'Privacy & Deletion' }} />
      <Stack.Screen name="export" options={{ title: 'Export' }} />
    </Stack>
  );
}

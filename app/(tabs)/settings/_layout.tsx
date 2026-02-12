import { Stack } from 'expo-router';

export default function SettingsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="units" options={{ headerShown: true, title: 'Units & Currency' }} />
      <Stack.Screen name="privacy" options={{ headerShown: true, title: 'Privacy & Deletion' }} />
      <Stack.Screen name="export" options={{ headerShown: true, title: 'Export' }} />
    </Stack>
  );
}

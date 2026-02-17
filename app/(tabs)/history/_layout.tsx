import { Stack } from 'expo-router';
import { useColors } from '@/theme/useColors';

export default function HistoryLayout() {
  const colors = useColors();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: true, title: 'History' }} />
      <Stack.Screen name="[id]" options={{ headerShown: true, title: 'Session Detail' }} />
      <Stack.Screen name="spending" options={{ headerShown: true, title: 'Spending' }} />
    </Stack>
  );
}

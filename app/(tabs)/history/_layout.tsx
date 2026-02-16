import { Stack } from 'expo-router';

export default function HistoryLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" options={{ headerShown: true, title: 'History' }} />
      <Stack.Screen name="[id]" options={{ headerShown: true, title: 'Session Detail' }} />
      <Stack.Screen name="spending" options={{ headerShown: true, title: 'Spending' }} />
    </Stack>
  );
}

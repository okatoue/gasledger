import { TouchableOpacity } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/theme/useColors';

export default function VehiclesLayout() {
  const router = useRouter();
  const colors = useColors();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: 'Vehicles',
          headerRight: () => (
            <TouchableOpacity onPress={() => router.push('/vehicles/add')} style={{ marginRight: 8 }}>
              <Ionicons name="add-circle" size={28} color={colors.primary} />
            </TouchableOpacity>
          ),
        }}
      />
      <Stack.Screen name="add" options={{ title: 'Add Vehicle' }} />
      <Stack.Screen name="[id]" options={{ title: 'Edit Vehicle' }} />
    </Stack>
  );
}

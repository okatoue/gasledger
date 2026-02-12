import { TouchableOpacity } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme/colors';

export default function VehiclesLayout() {
  const router = useRouter();

  return (
    <Stack>
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

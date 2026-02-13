import React, { useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/stores/authStore';
import { useVehicleStore } from '@/stores/vehicleStore';
import type { Vehicle } from '@/services/vehicle/vehicleService';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing, borderRadius } from '@/theme/spacing';

function VehicleCard({ vehicle, onPress }: { vehicle: Vehicle; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.7} onPress={onPress}>
      <View style={styles.cardHeader}>
        <Ionicons name="car-sport" size={24} color={colors.primary} />
        <Text style={styles.cardTitle}>
          {vehicle.year} {vehicle.make} {vehicle.model}
        </Text>
        <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
      </View>

      <View style={styles.detailsRow}>
        <View style={styles.detail}>
          <Text style={styles.detailLabel}>Fuel Type</Text>
          <Text style={styles.detailValue}>{vehicle.fuel_type}</Text>
        </View>
        {vehicle.efficiency_value > 0 && (
          <View style={styles.detail}>
            <Text style={styles.detailLabel}>Efficiency</Text>
            <Text style={styles.detailValue}>
              {vehicle.efficiency_value} {vehicle.efficiency_unit.toUpperCase()}
            </Text>
          </View>
        )}
        {vehicle.vin && (
          <View style={styles.detail}>
            <Text style={styles.detailLabel}>VIN</Text>
            <Text style={styles.detailValue} numberOfLines={1}>{vehicle.vin}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

export default function VehiclesScreen() {
  const session = useAuthStore((s) => s.session);
  const router = useRouter();
  const vehicles = useVehicleStore((s) => s.vehicles);
  const isLoaded = useVehicleStore((s) => s.isLoaded);

  useFocusEffect(
    useCallback(() => {
      if (!session) return;
      useVehicleStore.getState().refreshVehicles(session.user.id);
    }, [session]),
  );

  if (!isLoaded) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (vehicles.length === 0) {
    return (
      <View style={styles.centered}>
        <Ionicons name="car-outline" size={48} color={colors.textTertiary} />
        <Text style={styles.emptyText}>No vehicles yet</Text>
        <TouchableOpacity style={styles.addButtonInline} onPress={() => router.push('/vehicles/add')}>
          <Ionicons name="add" size={20} color={colors.white} />
          <Text style={styles.addButtonInlineText}>Add Vehicle</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <FlatList
      data={vehicles}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <VehicleCard vehicle={item} onPress={() => router.push(`/vehicles/${item.id}`)} />
      )}
      contentContainerStyle={styles.list}
      style={styles.container}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list: { padding: spacing.lg },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  emptyText: {
    ...typography.body,
    color: colors.textTertiary,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  addButtonInline: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    gap: 6,
  },
  addButtonInlineText: { ...typography.button, color: colors.white },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  cardTitle: {
    ...typography.h3,
    color: colors.text,
    marginLeft: 10,
    flex: 1,
  },
  detailsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.lg,
  },
  detail: {},
  detailLabel: {
    ...typography.caption,
    color: colors.textTertiary,
    marginBottom: 2,
  },
  detailValue: {
    ...typography.body,
    color: colors.text,
  },
});

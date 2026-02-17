import React, { useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/stores/authStore';
import { useVehicleStore } from '@/stores/vehicleStore';
import type { Vehicle } from '@/services/vehicle/vehicleService';
import AdBanner from '@/components/common/AdBanner';
import { adUnits } from '@/config/adUnits';
import { BannerAdSize } from 'react-native-google-mobile-ads';
import { useColors, type Colors } from '@/theme/useColors';
import { typography } from '@/theme/typography';
import { spacing, borderRadius } from '@/theme/spacing';

function VehicleCard({ vehicle, onPress, colors }: { vehicle: Vehicle; onPress: () => void; colors: Colors }) {
  return (
    <TouchableOpacity style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, shadowColor: colors.black }]} activeOpacity={0.7} onPress={onPress}>
      <View style={styles.cardHeader}>
        <Ionicons name="car-sport" size={24} color={colors.primary} />
        <Text style={[styles.cardTitle, { color: colors.text }]}>
          {vehicle.year} {vehicle.make} {vehicle.model}
        </Text>
        <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
      </View>

      <View style={styles.detailsRow}>
        <View style={styles.detail}>
          <Text style={[styles.detailLabel, { color: colors.textTertiary }]}>Fuel Type</Text>
          <Text style={[styles.detailValue, { color: colors.text }]}>{vehicle.fuel_type}</Text>
        </View>
        {vehicle.efficiency_value > 0 && (
          <View style={styles.detail}>
            <Text style={[styles.detailLabel, { color: colors.textTertiary }]}>Efficiency</Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>
              {vehicle.efficiency_value} {vehicle.efficiency_unit.toUpperCase()}
            </Text>
          </View>
        )}
        {vehicle.vin && (
          <View style={styles.detail}>
            <Text style={[styles.detailLabel, { color: colors.textTertiary }]}>VIN</Text>
            <Text style={[styles.detailValue, { color: colors.text }]} numberOfLines={1}>{vehicle.vin}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

export default function VehiclesScreen() {
  const colors = useColors();
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
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (vehicles.length === 0) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Ionicons name="car-outline" size={48} color={colors.textTertiary} />
        <Text style={[styles.emptyText, { color: colors.textTertiary }]}>No vehicles yet</Text>
        <TouchableOpacity style={[styles.addButtonInline, { backgroundColor: colors.primary }]} onPress={() => router.push('/vehicles/add')}>
          <Ionicons name="add" size={20} color={colors.white} />
          <Text style={[styles.addButtonInlineText, { color: colors.white }]}>Add Vehicle</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <FlatList
      data={vehicles}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <VehicleCard vehicle={item} onPress={() => router.push(`/vehicles/${item.id}`)} colors={colors} />
      )}
      ListHeaderComponent={<AdBanner unitId={adUnits.vehicles} size={BannerAdSize.MEDIUM_RECTANGLE} />}
      contentContainerStyle={styles.list}
      style={[styles.container, { backgroundColor: colors.background }]}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { padding: spacing.lg },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    ...typography.body,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  addButtonInline: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    gap: 6,
  },
  addButtonInlineText: { ...typography.button },
  card: {
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
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
    marginBottom: 2,
  },
  detailValue: {
    ...typography.body,
  },
});

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GasStation } from '@/services/places/placesService';
import { metersToMiles, metersToKm } from '@/services/fuel/unitConverter';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing, borderRadius } from '@/theme/spacing';

interface StationRowProps {
  station: GasStation;
  selectedFuelGrade: string;
  isHome: boolean;
  distanceUnit: 'mi' | 'km';
  onSelect: () => void;
  onToggleHome: () => void;
}

export default function StationRow({
  station,
  selectedFuelGrade,
  isHome,
  distanceUnit,
  onSelect,
  onToggleHome,
}: StationRowProps) {
  const priceMatch = station.fuelPrices.find((p) => p.fuelGrade === selectedFuelGrade);
  const distance =
    distanceUnit === 'mi'
      ? metersToMiles(station.distanceM).toFixed(1)
      : metersToKm(station.distanceM).toFixed(1);

  return (
    <TouchableOpacity style={styles.row} activeOpacity={0.7} onPress={onSelect}>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{station.name}</Text>
        <Text style={styles.address} numberOfLines={1}>{station.address}</Text>
        <Text style={styles.distance}>{distance} {distanceUnit}</Text>
      </View>
      <View style={styles.right}>
        {priceMatch ? (
          <Text style={styles.price}>${priceMatch.priceValue.toFixed(3)}</Text>
        ) : (
          <Text style={styles.priceNA}>N/A</Text>
        )}
        <TouchableOpacity onPress={onToggleHome} hitSlop={8} style={styles.starButton}>
          <Ionicons
            name={isHome ? 'star' : 'star-outline'}
            size={22}
            color={isHome ? colors.warning : colors.textTertiary}
          />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm + 4,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  info: { flex: 1, marginRight: spacing.sm },
  name: { ...typography.label, color: colors.text },
  address: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  distance: { ...typography.caption, color: colors.textTertiary, marginTop: 2 },
  right: { alignItems: 'flex-end', gap: 4 },
  price: { ...typography.h3, color: colors.success },
  priceNA: { ...typography.label, color: colors.textTertiary },
  starButton: { padding: 4 },
});

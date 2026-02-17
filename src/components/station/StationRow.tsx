import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GasStation } from '@/services/places/placesService';
import { metersToMiles, metersToKm } from '@/services/fuel/unitConverter';
import { detectBrand, getBrandLogoUrl } from '@/utils/stationBrands';
import { useColors } from '@/theme/useColors';
import { typography } from '@/theme/typography';
import { spacing, borderRadius } from '@/theme/spacing';

interface StationRowProps {
  station: GasStation;
  selectedFuelType: string;
  isHome: boolean;
  distanceUnit: 'mi' | 'km';
  onSelect: () => void;
  onToggleHome: () => void;
}

const CIRCLE_SIZE = 40;

export default function StationRow({
  station,
  selectedFuelType,
  isHome,
  distanceUnit,
  onSelect,
  onToggleHome,
}: StationRowProps) {
  const colors = useColors();
  const priceMatch = station.fuelPrices.find((p) => p.fuelType === selectedFuelType);
  const distance =
    distanceUnit === 'mi'
      ? metersToMiles(station.distanceM).toFixed(1)
      : metersToKm(station.distanceM).toFixed(1);
  const brand = detectBrand(station.name);
  const logoUrl = getBrandLogoUrl(brand);
  const [logoError, setLogoError] = useState(false);

  return (
    <TouchableOpacity style={[styles.row, { borderBottomColor: colors.border }]} activeOpacity={0.7} onPress={onSelect}>
      <View style={[styles.brandCircle, { backgroundColor: logoUrl && !logoError ? '#FFFFFF' : brand.bgColor }]}>
        {logoUrl && !logoError ? (
          <Image
            source={{ uri: logoUrl }}
            style={styles.brandLogo}
            onError={() => setLogoError(true)}
          />
        ) : (
          <Text style={[styles.brandInitial, { color: brand.color }]}>
            {brand.label.charAt(0)}
          </Text>
        )}
      </View>
      <View style={styles.info}>
        <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>{station.name}</Text>
        <Text style={[styles.address, { color: colors.textSecondary }]} numberOfLines={1}>{station.address}</Text>
        <Text style={[styles.distance, { color: colors.textTertiary }]}>{distance} {distanceUnit}</Text>
      </View>
      <View style={styles.right}>
        {priceMatch ? (
          <Text style={[styles.price, { color: colors.success }]}>${priceMatch.priceValue.toFixed(3)}</Text>
        ) : (
          <Text style={[styles.priceNA, { color: colors.textTertiary }]}>N/A</Text>
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
  },
  brandCircle: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm + 2,
  },
  brandLogo: {
    width: CIRCLE_SIZE - 8,
    height: CIRCLE_SIZE - 8,
    borderRadius: (CIRCLE_SIZE - 8) / 2,
    resizeMode: 'contain',
  },
  brandInitial: {
    fontSize: 14,
    fontWeight: '800',
  },
  info: { flex: 1, marginRight: spacing.sm },
  name: { ...typography.label },
  address: { ...typography.caption, marginTop: 2 },
  distance: { ...typography.caption, marginTop: 2 },
  right: { alignItems: 'flex-end', gap: 4 },
  price: { ...typography.h3 },
  priceNA: { ...typography.label },
  starButton: { padding: 4 },
});

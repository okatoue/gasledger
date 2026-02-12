import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  ListRenderItemInfo,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { GasStation } from '@/services/places/placesService';
import { metersToMiles, metersToKm } from '@/services/fuel/unitConverter';
import { detectBrand } from '@/utils/stationBrands';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing, borderRadius } from '@/theme/spacing';

// ── Memoized station card ──
const StationCard = React.memo(function StationCard({
  station,
  selectedFuelGrade,
  distanceUnit,
  isHome,
  onSelectPrice,
}: {
  station: GasStation;
  selectedFuelGrade: string;
  distanceUnit: 'mi' | 'km';
  isHome: boolean;
  onSelectPrice: (price: number) => void;
}) {
  const priceMatch = station.fuelPrices.find((p) => p.fuelGrade === selectedFuelGrade);
  const distance =
    distanceUnit === 'mi'
      ? metersToMiles(station.distanceM).toFixed(1)
      : metersToKm(station.distanceM).toFixed(1);
  const brand = detectBrand(station.name);

  const handlePress = useCallback(() => {
    if (priceMatch) onSelectPrice(priceMatch.priceValue);
  }, [priceMatch, onSelectPrice]);

  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.7} onPress={handlePress}>
      {/* Circular brand icon */}
      <View style={styles.brandWrapper}>
        <View style={[styles.brandCircle, { backgroundColor: brand.bgColor }]}>
          {brand.icon ? (
            <Image source={brand.icon} style={styles.brandIcon} />
          ) : (
            <Text style={[styles.brandInitial, { color: brand.color }]}>
              {brand.label}
            </Text>
          )}
        </View>
        {isHome && (
          <View style={styles.homeBadge}>
            <Ionicons name="star" size={10} color={colors.warning} />
          </View>
        )}
      </View>

      {/* Info — centered */}
      <Text style={styles.cardName} numberOfLines={1}>{station.name}</Text>
      {priceMatch ? (
        <Text style={styles.cardPrice}>${priceMatch.priceValue.toFixed(3)}</Text>
      ) : (
        <Text style={styles.cardPriceNA}>N/A</Text>
      )}
      <Text style={styles.cardDistance}>{distance} {distanceUnit}</Text>
    </TouchableOpacity>
  );
});

// ── Props ──
interface NearbyStationsBarProps {
  stations: GasStation[];
  isLoading: boolean;
  error: string | null;
  selectedFuelGrade: string;
  distanceUnit: 'mi' | 'km';
  homeStationPlaceId: string | null;
  onSelectPrice: (price: number) => void;
  onToggleHome: (station: GasStation) => void;
}

const CARD_WIDTH = 110;
const CARD_GAP = spacing.sm;

const keyExtractor = (item: GasStation) => item.placeId;

const getItemLayout = (_data: any, index: number) => ({
  length: CARD_WIDTH + CARD_GAP,
  offset: (CARD_WIDTH + CARD_GAP) * index + spacing.md, // account for contentContainerStyle padding
  index,
});

function NearbyStationsBar({
  stations,
  isLoading,
  error,
  selectedFuelGrade,
  distanceUnit,
  homeStationPlaceId,
  onSelectPrice,
}: NearbyStationsBarProps) {
  const router = useRouter();

  const handleSeeMap = useCallback(() => {
    router.push({ pathname: '/stations/map', params: { fuelGrade: selectedFuelGrade } });
  }, [router, selectedFuelGrade]);

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<GasStation>) => (
      <StationCard
        station={item}
        selectedFuelGrade={selectedFuelGrade}
        distanceUnit={distanceUnit}
        isHome={item.placeId === homeStationPlaceId}
        onSelectPrice={onSelectPrice}
      />
    ),
    [selectedFuelGrade, distanceUnit, homeStationPlaceId, onSelectPrice],
  );

  return (
    <View style={styles.outer}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="flame" size={18} color={colors.primary} />
          <Text style={styles.headerTitle}>Nearby Stations</Text>
        </View>
        <TouchableOpacity
          style={styles.seeMapButton}
          onPress={handleSeeMap}
          activeOpacity={0.7}
        >
          <Text style={styles.seeMapText}>See Map</Text>
          <Ionicons name="chevron-forward" size={14} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Content */}
      {isLoading && stations.length === 0 ? (
        <View style={styles.centered}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.centeredText}>Searching nearby...</Text>
        </View>
      ) : error && stations.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={24} color={colors.textTertiary} />
          <Text style={styles.centeredText}>{error}</Text>
        </View>
      ) : (
        <FlatList
          horizontal
          data={stations}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          getItemLayout={getItemLayout}
          showsHorizontalScrollIndicator={false}
          style={styles.cardScroll}
          contentContainerStyle={styles.cardList}
          removeClippedSubviews
        />
      )}
    </View>
  );
}

export default React.memo(NearbyStationsBar);

const CIRCLE_SIZE = 52;

const styles = StyleSheet.create({
  outer: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm + 4,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerTitle: {
    ...typography.label,
    color: colors.text,
  },
  seeMapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  seeMapText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    gap: 6,
  },
  centeredText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  cardList: {
    gap: CARD_GAP,
    paddingHorizontal: spacing.md,
  },
  cardScroll: {
    marginHorizontal: -spacing.md,
  },
  card: {
    width: CARD_WIDTH,
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },

  // ── Circular brand icon ──
  brandWrapper: {
    marginBottom: spacing.sm,
  },
  brandCircle: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandIcon: {
    width: 30,
    height: 30,
    resizeMode: 'contain',
  },
  brandInitial: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  homeBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: colors.surface,
    borderRadius: 8,
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },

  // ── Centered text info ──
  cardName: {
    ...typography.label,
    color: colors.text,
    fontSize: 12,
    textAlign: 'center',
    width: CARD_WIDTH,
    paddingHorizontal: 4,
  },
  cardPrice: {
    ...typography.h3,
    color: colors.success,
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 2,
  },
  cardPriceNA: {
    ...typography.label,
    color: colors.textTertiary,
    textAlign: 'center',
    marginTop: 2,
  },
  cardDistance: {
    ...typography.caption,
    color: colors.textTertiary,
    fontSize: 11,
    textAlign: 'center',
    marginTop: 1,
  },
});

import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, Region, PROVIDER_GOOGLE } from 'react-native-maps';
import { useStationStore } from '@/stores/stationStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { GasStation } from '@/services/places/placesService';
import { metersToMiles, metersToKm } from '@/services/fuel/unitConverter';
import { FUEL_GRADES } from '@/utils/fuelGrades';
import { detectBrand, getBrandLogoUrl } from '@/utils/stationBrands';
import FuelGradePicker from '@/components/common/FuelGradePicker';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing, borderRadius } from '@/theme/spacing';

// ── Static marker — never re-renders after mount ──
const StationMarker = React.memo(
  function StationMarker({
    station,
    priceLabel,
    loading,
    onPress,
    tracksViewChanges,
  }: {
    station: GasStation;
    priceLabel: string;
    loading: boolean;
    onPress: (station: GasStation) => void;
    tracksViewChanges: boolean;
  }) {
    const handlePress = useCallback(() => onPress(station), [station.placeId, onPress]);

    return (
      <Marker
        coordinate={{ latitude: station.latitude, longitude: station.longitude }}
        onPress={handlePress}
        tracksViewChanges={tracksViewChanges}
        stopPropagation
      >
        {/* collapsable={false} prevents Android from collapsing intermediate
            views, which would break the marker bitmap capture */}
        <View style={markerStyles.container} collapsable={false}>
          <View style={markerStyles.bubble} collapsable={false}>
            <Text style={markerStyles.text}>{loading ? '...' : priceLabel}</Text>
          </View>
          <View style={markerStyles.arrow} />
        </View>
      </Marker>
    );
  },
  (prev, next) =>
    prev.station.placeId === next.station.placeId &&
    prev.priceLabel === next.priceLabel &&
    prev.loading === next.loading &&
    prev.tracksViewChanges === next.tracksViewChanges,
);

// ── Memoized detail card — avoids redundant fuelPrices lookups ──
const DETAIL_CIRCLE = 44;

const DetailCard = React.memo(function DetailCard({
  station,
  selectedFuelGrade,
  distanceLabel,
  onUsePrice,
  onSelectGrade,
  bottomInset,
}: {
  station: GasStation;
  selectedFuelGrade: string;
  distanceLabel: string;
  onUsePrice: () => void;
  onSelectGrade: (grade: string) => void;
  bottomInset: number;
}) {
  const brand = detectBrand(station.name);
  const logoUrl = getBrandLogoUrl(brand);
  const [logoError, setLogoError] = useState(false);

  // Build a price-by-grade map once
  const priceByGrade = useMemo(() => {
    const map: Record<string, number | null> = {};
    for (const g of FUEL_GRADES) {
      const match = station.fuelPrices.find((p) => p.fuelGrade === g.value);
      map[g.value] = match ? match.priceValue : null;
    }
    return map;
  }, [station.fuelPrices]);

  const hasSelectedPrice = priceByGrade[selectedFuelGrade] != null;

  return (
    <View style={[styles.detailCard, { paddingBottom: bottomInset + spacing.md }]}>
      <View style={styles.detailHeader}>
        <View style={[styles.detailBrandCircle, { backgroundColor: logoUrl && !logoError ? '#FFFFFF' : brand.bgColor }]}>
          {logoUrl && !logoError ? (
            <Image
              source={{ uri: logoUrl }}
              style={styles.detailBrandLogo}
              onError={() => setLogoError(true)}
            />
          ) : (
            <Text style={[styles.detailBrandInitial, { color: brand.color }]}>
              {brand.label.charAt(0)}
            </Text>
          )}
        </View>
        <View style={styles.detailInfo}>
          <Text style={styles.detailName} numberOfLines={1}>{station.name}</Text>
          <Text style={styles.detailAddress} numberOfLines={1}>{station.address}</Text>
          <Text style={styles.detailDistance}>{distanceLabel}</Text>
        </View>
      </View>

      {/* Prices per grade */}
      <View style={styles.pricesRow}>
        {FUEL_GRADES.map((g) => {
          const price = priceByGrade[g.value];
          const isSelected = g.value === selectedFuelGrade;
          return (
            <TouchableOpacity
              key={g.value}
              style={[styles.priceChip, isSelected && styles.priceChipSelected]}
              onPress={() => onSelectGrade(g.value)}
              activeOpacity={0.7}
            >
              <Text style={[styles.priceChipLabel, isSelected && styles.priceChipLabelSelected]}>
                {g.text}
              </Text>
              <Text style={[styles.priceChipValue, isSelected && styles.priceChipValueSelected]}>
                {price != null ? `$${price.toFixed(3)}` : 'N/A'}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Use This Price button */}
      {hasSelectedPrice && (
        <TouchableOpacity style={styles.useButton} onPress={onUsePrice} activeOpacity={0.8}>
          <Ionicons name="pricetag" size={18} color={colors.white} />
          <Text style={styles.useButtonText}>Use This Price</Text>
        </TouchableOpacity>
      )}
    </View>
  );
});

export default function StationsMapScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ fuelGrade?: string }>();

  const stations = useStationStore((s) => s.stations);
  const userLocation = useStationStore((s) => s.userLocation);
  const setPendingSelection = useStationStore((s) => s.setPendingSelection);
  const distanceUnit = useSettingsStore((s) => s.distanceUnit);

  const [selectedFuelGrade, setSelectedFuelGrade] = useState(params.fuelGrade ?? 'regular');

  // Marker lifecycle: loading → revealing → settled
  // 'loading'   — show "..." placeholder, tracksViewChanges=true
  // 'revealing'  — show prices, tracksViewChanges=true (brief bitmap capture window)
  // 'settled'   — tracksViewChanges=false, bitmap frozen
  const [markerPhase, setMarkerPhase] = useState<'loading' | 'revealing' | 'settled'>('revealing');
  const isFirstGrade = useRef(true);

  useEffect(() => {
    if (isFirstGrade.current) {
      isFirstGrade.current = false;
      // Initial mount — already 'revealing', just settle after bitmap capture
      const settle = setTimeout(() => setMarkerPhase('settled'), 800);
      return () => clearTimeout(settle);
    }

    // Grade changed — loading → 300ms → revealing → 400ms → settled
    setMarkerPhase('loading');
    const reveal = setTimeout(() => setMarkerPhase('revealing'), 300);
    const settle = setTimeout(() => setMarkerPhase('settled'), 700);
    return () => { clearTimeout(reveal); clearTimeout(settle); };
  }, [selectedFuelGrade]);
  const [selectedStation, setSelectedStation] = useState<GasStation | null>(null);
  const mapRef = useRef<MapView>(null);

  const initialRegion: Region | undefined = userLocation
    ? {
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      }
    : undefined;

  // Only show stations that have a price for the selected grade
  const visibleStations = useMemo(
    () => stations.filter((s) => s.fuelPrices.some((p) => p.fuelGrade === selectedFuelGrade)),
    [stations, selectedFuelGrade],
  );

  // Pre-compute price labels so markers get stable string props
  const priceLabels = useMemo(() => {
    const map: Record<string, string> = {};
    for (const s of visibleStations) {
      const match = s.fuelPrices.find((p) => p.fuelGrade === selectedFuelGrade);
      map[s.placeId] = `$${match!.priceValue.toFixed(2)}`;
    }
    return map;
  }, [visibleStations, selectedFuelGrade]);

  // Stable callback — markers hold a reference to this
  const handleMarkerPress = useCallback((station: GasStation) => {
    setSelectedStation(station);
  }, []);

  const handleMapPress = useCallback(() => {
    setSelectedStation(null);
  }, []);

  const handleUsePrice = useCallback(() => {
    if (!selectedStation) return;
    const priceMatch = selectedStation.fuelPrices.find((p) => p.fuelGrade === selectedFuelGrade);
    if (priceMatch) {
      setPendingSelection({
        price: priceMatch.priceValue,
        stationName: selectedStation.name,
        fuelGrade: selectedFuelGrade,
      });
    }
    // Small delay so Zustand subscribers fire before navigation
    setTimeout(() => router.back(), 50);
  }, [selectedStation, selectedFuelGrade, setPendingSelection, router]);

  const getDistanceLabel = useCallback(
    (station: GasStation): string => {
      return distanceUnit === 'mi'
        ? `${metersToMiles(station.distanceM).toFixed(1)} mi`
        : `${metersToKm(station.distanceM).toFixed(1)} km`;
    },
    [distanceUnit],
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12} style={styles.backButton}>
          <Ionicons name="chevron-down" size={28} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Nearby Gas Stations</Text>
        <View style={{ width: 28 }} />
      </View>

      {/* Fuel Grade Picker */}
      <View style={styles.fuelGradeBar}>
        <FuelGradePicker selected={selectedFuelGrade} onSelect={setSelectedFuelGrade} />
      </View>

      {/* Map */}
      {initialRegion ? (
        <MapView
          ref={mapRef}
          provider={PROVIDER_GOOGLE}
          style={styles.map}
          initialRegion={initialRegion}
          showsUserLocation
          showsMyLocationButton={Platform.OS === 'android'}
          onPress={handleMapPress}
          moveOnMarkerPress={false}
        >
          {visibleStations.map((station) => (
            <StationMarker
              key={station.placeId}
              station={station}
              priceLabel={priceLabels[station.placeId]}
              loading={markerPhase === 'loading'}
              onPress={handleMarkerPress}
              tracksViewChanges={markerPhase !== 'settled'}
            />
          ))}
        </MapView>
      ) : (
        <View style={styles.noLocation}>
          <Ionicons name="location-outline" size={48} color={colors.textTertiary} />
          <Text style={styles.noLocationText}>Location not available</Text>
        </View>
      )}

      {/* Bottom Detail Card */}
      {selectedStation && (
        <DetailCard
          station={selectedStation}
          selectedFuelGrade={selectedFuelGrade}
          distanceLabel={getDistanceLabel(selectedStation)}
          onUsePrice={handleUsePrice}
          onSelectGrade={setSelectedFuelGrade}
          bottomInset={insets.bottom}
        />
      )}
    </View>
  );
}

// ── Marker styles — defined outside component, never recreated ──
const markerStyles = StyleSheet.create({
  container: { alignItems: 'center' },
  bubble: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.sm,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  text: { ...typography.caption, fontWeight: '700', color: colors.primary },
  arrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderTopWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: colors.primary,
    marginTop: -1,
  },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: { padding: 2 },
  headerTitle: { ...typography.h3, color: colors.text },
  fuelGradeBar: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  map: { flex: 1 },

  // ── No location fallback ──
  noLocation: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  noLocationText: { ...typography.body, color: colors.textSecondary },

  // ── Detail Card ──
  detailCard: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: spacing.lg,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  detailBrandCircle: {
    width: DETAIL_CIRCLE,
    height: DETAIL_CIRCLE,
    borderRadius: DETAIL_CIRCLE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm + 2,
  },
  detailBrandLogo: {
    width: DETAIL_CIRCLE - 8,
    height: DETAIL_CIRCLE - 8,
    borderRadius: (DETAIL_CIRCLE - 8) / 2,
    resizeMode: 'contain',
  },
  detailBrandInitial: {
    fontSize: 15,
    fontWeight: '800',
  },
  detailInfo: { flex: 1 },
  detailName: { ...typography.h3, color: colors.text },
  detailAddress: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  detailDistance: { ...typography.caption, color: colors.textTertiary, marginTop: 2 },

  // ── Prices Row ──
  pricesRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: spacing.md,
  },
  priceChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surfaceSecondary,
  },
  priceChipSelected: { backgroundColor: colors.primary },
  priceChipLabel: { ...typography.caption, color: colors.textSecondary, marginBottom: 2 },
  priceChipLabelSelected: { color: 'rgba(255,255,255,0.8)' },
  priceChipValue: { ...typography.label, color: colors.text, fontWeight: '700' },
  priceChipValueSelected: { color: colors.white },

  // ── Use Button ──
  useButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm + 4,
  },
  useButtonText: { ...typography.button, color: colors.white },
});

import React, { useCallback, useMemo, useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  ListRenderItemInfo,
  Modal,
  Pressable,
  TextInput,
  Animated,
  Linking,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { GasStation } from '@/services/places/placesService';
import { metersToMiles, metersToKm } from '@/services/fuel/unitConverter';
import { detectBrand, getBrandLogoUrl } from '@/utils/stationBrands';
import * as Location from 'expo-location';
import Svg, { Path } from 'react-native-svg';
import FuelTypePicker from '@/components/common/FuelTypePicker';
import { useColors } from '@/theme/useColors';
import { typography } from '@/theme/typography';
import { spacing, borderRadius } from '@/theme/spacing';

// ── Memoized station card ──
const StationCard = React.memo(function StationCard({
  station,
  selectedFuelType,
  distanceUnit,
  isHome,
  isPro,
  onSelectPrice,
  onToggleHome,
}: {
  station: GasStation;
  selectedFuelType: string;
  distanceUnit: 'mi' | 'km';
  isHome: boolean;
  isPro: boolean;
  onSelectPrice: (price: number) => void;
  onToggleHome: () => void;
}) {
  const colors = useColors();
  const priceMatch = station.fuelPrices.find((p) => p.fuelType === selectedFuelType);
  const distance =
    distanceUnit === 'mi'
      ? metersToMiles(station.distanceM).toFixed(1)
      : metersToKm(station.distanceM).toFixed(1);
  const brand = detectBrand(station.name);
  const logoUrl = getBrandLogoUrl(brand);
  const [logoError, setLogoError] = useState(false);

  const router = useRouter();

  const handlePress = useCallback(() => {
    if (priceMatch) onSelectPrice(priceMatch.priceValue);
  }, [priceMatch, onSelectPrice]);

  const handleLongPress = useCallback(() => {
    if (!isPro) {
      router.push('/pro');
      return;
    }
    onToggleHome();
  }, [isPro, onToggleHome, router]);

  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.7} onPress={handlePress} onLongPress={handleLongPress}>
      {/* Circular brand icon */}
      <View style={styles.brandWrapper}>
        <View style={[styles.brandCircle, { backgroundColor: logoUrl && !logoError ? '#FFFFFF' : brand.bgColor }]}>
          {logoUrl && !logoError ? (
            <Image
              source={{ uri: logoUrl }}
              style={styles.brandLogo}
              onError={() => setLogoError(true)}
            />
          ) : brand.icon ? (
            <Image source={brand.icon} style={styles.brandIcon} />
          ) : (
            <Text style={[styles.brandInitial, { color: brand.color }]}>
              {brand.label}
            </Text>
          )}
        </View>
        {isHome && (
          <View style={[styles.homeBadge, { backgroundColor: colors.surface, shadowColor: colors.black }]}>
            <Ionicons name="star" size={10} color={colors.warning} />
          </View>
        )}
      </View>

      {/* Info — centered */}
      <Text style={[styles.cardName, { color: colors.text }]} numberOfLines={1}>{station.name}</Text>
      {priceMatch ? (
        <Text style={[styles.cardPrice, { color: colors.success }]}>${priceMatch.priceValue.toFixed(3)}</Text>
      ) : (
        <Text style={[styles.cardPriceNA, { color: colors.textTertiary }]}>N/A</Text>
      )}
      <Text style={[styles.cardDistance, { color: colors.textTertiary }]}>{distance} {distanceUnit}</Text>
    </TouchableOpacity>
  );
});

// ── Station row for expanded modal ──
const StationRow = React.memo(function StationRow({
  station,
  selectedFuelType,
  distanceUnit,
  isHome,
  isPro,
  expanded,
  onToggleExpand,
  onSelectPrice,
  onToggleHome,
}: {
  station: GasStation;
  selectedFuelType: string;
  distanceUnit: 'mi' | 'km';
  isHome: boolean;
  isPro: boolean;
  expanded: boolean;
  onToggleExpand: () => void;
  onSelectPrice: (price: number) => void;
  onToggleHome: () => void;
}) {
  const colors = useColors();
  const router = useRouter();
  const priceMatch = station.fuelPrices.find((p) => p.fuelType === selectedFuelType);
  const distance =
    distanceUnit === 'mi'
      ? metersToMiles(station.distanceM).toFixed(1)
      : metersToKm(station.distanceM).toFixed(1);
  const brand = detectBrand(station.name);
  const logoUrl = getBrandLogoUrl(brand);
  const [logoError, setLogoError] = useState(false);

  const handleOpenInMaps = useCallback(() => {
    const name = encodeURIComponent(station.name);
    const url = `https://www.google.com/maps/search/?api=1&query=${name}&query_place_id=${station.placeId}`;
    Linking.openURL(url);
  }, [station]);

  const handleUsePrice = useCallback(() => {
    if (priceMatch) onSelectPrice(priceMatch.priceValue);
  }, [priceMatch, onSelectPrice]);

  const handleSetHome = useCallback(() => {
    if (!isPro) {
      router.push('/pro');
      return;
    }
    onToggleHome();
  }, [isPro, onToggleHome, router]);

  return (
    <View style={[styles.rowContainer, { borderBottomColor: colors.border }]}>
      <TouchableOpacity
        style={styles.row}
        activeOpacity={0.7}
        onPress={onToggleExpand}
      >
        <View style={styles.rowBrandWrapper}>
          <View style={[styles.brandCircle, { backgroundColor: logoUrl && !logoError ? '#FFFFFF' : brand.bgColor }]}>
            {logoUrl && !logoError ? (
              <Image
                source={{ uri: logoUrl }}
                style={styles.brandLogo}
                onError={() => setLogoError(true)}
              />
            ) : brand.icon ? (
              <Image source={brand.icon} style={styles.brandIcon} />
            ) : (
              <Text style={[styles.brandInitial, { color: brand.color }]}>
                {brand.label}
              </Text>
            )}
          </View>
          {isHome && (
            <View style={[styles.homeBadge, { backgroundColor: colors.surface, shadowColor: colors.black }]}>
              <Ionicons name="star" size={10} color={colors.warning} />
            </View>
          )}
        </View>

        <View style={styles.rowInfo}>
          <Text style={[styles.rowName, { color: colors.text }]} numberOfLines={1}>{station.name}</Text>
          {station.address ? (
            <Text style={[styles.rowAddress, { color: colors.textSecondary }]} numberOfLines={1}>{station.address}</Text>
          ) : null}
        </View>

        <View style={styles.rowRight}>
          {priceMatch ? (
            <Text style={[styles.rowPrice, { color: colors.success }]}>${priceMatch.priceValue.toFixed(3)}</Text>
          ) : (
            <Text style={[styles.rowPriceNA, { color: colors.textTertiary }]}>N/A</Text>
          )}
          <Text style={[styles.rowDistance, { color: colors.textTertiary }]}>{distance} {distanceUnit}</Text>
        </View>
      </TouchableOpacity>

      {expanded && (
        <View style={styles.rowActions}>
          <TouchableOpacity
            style={[styles.rowActionBtn, { backgroundColor: colors.primary }]}
            onPress={handleUsePrice}
            activeOpacity={0.7}
            disabled={!priceMatch}
          >
            <Ionicons name="pricetag-outline" size={15} color="#FFFFFF" />
            <Text style={styles.rowActionText}>Use Price</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.rowActionBtn, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, borderWidth: 1 }]}
            onPress={handleSetHome}
            activeOpacity={0.7}
          >
            <Ionicons name={!isPro ? 'lock-closed' : isHome ? 'star' : 'star-outline'} size={15} color={!isPro ? colors.textTertiary : isHome ? colors.warning : colors.text} />
            <Text style={[styles.rowActionText, { color: colors.text }]}>
              {isHome ? 'Remove Home' : 'Set as Home'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.rowActionBtn, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, borderWidth: 1 }]}
            onPress={handleOpenInMaps}
            activeOpacity={0.7}
          >
            <Ionicons name="navigate-outline" size={15} color={colors.primary} />
            <Text style={[styles.rowActionText, { color: colors.text }]}>Open in Maps</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
});

// ── Expanded bottom sheet modal ──
function StationListModal({
  visible,
  stations,
  selectedFuelType,
  distanceUnit,
  homeStationPlaceId,
  isPro,
  onSelectPrice,
  onToggleHome,
  onClose,
  postalCode,
  onPostalCodeChange,
  onFuelTypeChange,
}: {
  visible: boolean;
  stations: GasStation[];
  selectedFuelType: string;
  distanceUnit: 'mi' | 'km';
  homeStationPlaceId: string | null;
  isPro: boolean;
  onSelectPrice: (price: number) => void;
  onToggleHome: (station: GasStation) => void;
  onClose: () => void;
  postalCode: string | null;
  onPostalCodeChange: (code: string) => void;
  onFuelTypeChange: (type: string) => void;
}) {
  const colors = useColors();
  const [pcModalVisible, setPcModalVisible] = useState(false);
  const [sortMode, setSortMode] = useState<'distance' | 'price'>('distance');
  const [expandedPlaceId, setExpandedPlaceId] = useState<string | null>(null);
  const sortSlideAnim = useRef(new Animated.Value(0)).current;
  const sortIndicatorWidth = useRef(new Animated.Value(0)).current;
  const sortPillLayouts = useRef<{ x: number; width: number }[]>([]);

  const animateSortTo = (index: number) => {
    const layout = sortPillLayouts.current[index];
    if (!layout) return;
    Animated.spring(sortSlideAnim, {
      toValue: layout.x - 3, // offset by capsule padding
      useNativeDriver: false,
      speed: 20,
      bounciness: 0,
    }).start();
    Animated.spring(sortIndicatorWidth, {
      toValue: layout.width,
      useNativeDriver: false,
      speed: 20,
      bounciness: 0,
    }).start();
  };

  useEffect(() => {
    animateSortTo(sortMode === 'distance' ? 0 : 1);
  }, [sortMode]);

  useEffect(() => {
    if (!visible) setExpandedPlaceId(null);
  }, [visible]);

  const handleSortPillLayout = (index: number) => (e: any) => {
    const { x, width } = e.nativeEvent.layout;
    sortPillLayouts.current[index] = { x, width };
    const targetIndex = sortMode === 'distance' ? 0 : 1;
    if (index === targetIndex) {
      sortSlideAnim.setValue(x - 3);
      sortIndicatorWidth.setValue(width);
    }
  };

  const sortedStations = useMemo(() => {
    const filtered = stations.filter((s) => s.fuelPrices.some((p) => p.fuelType === selectedFuelType));
    if (sortMode === 'price') {
      return [...filtered].sort((a, b) => {
        const aPrice = a.fuelPrices.find((p) => p.fuelType === selectedFuelType)?.priceValue ?? Infinity;
        const bPrice = b.fuelPrices.find((p) => p.fuelType === selectedFuelType)?.priceValue ?? Infinity;
        return aPrice - bPrice;
      });
    }
    return filtered;
  }, [stations, selectedFuelType, sortMode]);

  const handleSelectPrice = useCallback(
    (price: number) => {
      setExpandedPlaceId(null);
      onSelectPrice(price);
      onClose();
    },
    [onSelectPrice, onClose],
  );

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<GasStation>) => (
      <StationRow
        station={item}
        selectedFuelType={selectedFuelType}
        distanceUnit={distanceUnit}
        isHome={item.placeId === homeStationPlaceId}
        isPro={isPro}
        expanded={item.placeId === expandedPlaceId}
        onToggleExpand={() => setExpandedPlaceId((prev) => prev === item.placeId ? null : item.placeId)}
        onSelectPrice={handleSelectPrice}
        onToggleHome={() => onToggleHome(item)}
      />
    ),
    [selectedFuelType, distanceUnit, homeStationPlaceId, isPro, expandedPlaceId, handleSelectPrice, onToggleHome],
  );

  return (
    <Modal visible={visible} transparent animationType="slide">
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={[styles.modalSheet, { backgroundColor: colors.surface }]} onPress={() => {}}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Nearby Stations</Text>
            <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Fuel type picker */}
          <View style={styles.modalFuelPicker}>
            <FuelTypePicker selected={selectedFuelType} onSelect={onFuelTypeChange} />
          </View>

          {/* Sort toggle + postal code */}
          <View style={styles.modalFilterRow}>
          <View style={[styles.modalSortCapsule, { backgroundColor: colors.surfaceSecondary }]}>
            <Animated.View
              style={[
                styles.modalSortIndicator,
                { width: sortIndicatorWidth, left: undefined, transform: [{ translateX: sortSlideAnim }], backgroundColor: colors.primary },
              ]}
            />
            <TouchableOpacity
              style={styles.modalSortPill}
              onPress={() => setSortMode('distance')}
              onLayout={handleSortPillLayout(0)}
              activeOpacity={0.7}
            >
              <Ionicons
                name="location-outline"
                size={14}
                color={sortMode === 'distance' ? '#FFFFFF' : colors.textSecondary}
              />
              <Text style={[styles.modalSortLabel, { color: colors.textSecondary }, sortMode === 'distance' && styles.modalSortLabelActive]}>
                Distance
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalSortPill}
              onPress={() => setSortMode('price')}
              onLayout={handleSortPillLayout(1)}
              activeOpacity={0.7}
            >
              <Text style={[styles.modalSortDollar, { color: sortMode === 'price' ? '#FFFFFF' : colors.textSecondary }]}>
                $
              </Text>
              <Text style={[styles.modalSortLabel, { color: colors.textSecondary }, sortMode === 'price' && styles.modalSortLabelActive]}>
                Price
              </Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={[styles.modalPostalBox, { backgroundColor: colors.surfaceSecondary }]} onPress={() => setPcModalVisible(true)} activeOpacity={0.7}>
            <Ionicons name="location-outline" size={14} color={colors.primary} />
            <Text style={[styles.modalPostalText, { color: colors.primary }]}>{postalCode ?? 'Set zip'}</Text>
          </TouchableOpacity>
          </View>

          {/* Station list */}
          <FlatList
            data={sortedStations}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            showsVerticalScrollIndicator={false}
            style={styles.modalList}
            contentContainerStyle={styles.modalListContent}
          />
          <PostalCodeModal
            visible={pcModalVisible}
            currentPostalCode={postalCode}
            onSave={onPostalCodeChange}
            onClose={() => setPcModalVisible(false)}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ── Postal Code Modal ──
function PostalCodeModal({
  visible,
  currentPostalCode,
  onSave,
  onClose,
}: {
  visible: boolean;
  currentPostalCode: string | null;
  onSave: (code: string) => void;
  onClose: () => void;
}) {
  const colors = useColors();
  const [value, setValue] = useState(currentPostalCode ?? '');
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    if (visible) {
      setValue(currentPostalCode ?? '');
      setLocating(false);
    }
  }, [visible, currentPostalCode]);

  const handleMyLocation = async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocating(false);
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const results = await Location.reverseGeocodeAsync({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      });
      const postal = results?.[0]?.postalCode;
      if (postal) {
        setValue(postal);
      }
    } catch (e) {
      console.error('[PostalCodeModal] Location lookup failed:', e);
    } finally {
      setLocating(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <Pressable style={styles.pcOverlay} onPress={onClose}>
        <Pressable style={[styles.pcCard, { backgroundColor: colors.surface }]} onPress={() => {}}>
          <Text style={[styles.pcTitle, { color: colors.text }]}>Update Zip / Postal Code</Text>
          <View style={styles.pcInputRow}>
            <TextInput
              style={[styles.pcInput, styles.pcInputFlex, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, color: colors.text }]}
              value={value}
              onChangeText={setValue}
              placeholder="e.g. 90210"
              placeholderTextColor={colors.textTertiary}
              autoFocus
              autoCorrect={false}
              autoCapitalize="characters"
              returnKeyType="done"
              onSubmitEditing={() => {
                if (value.trim()) { onSave(value.trim()); onClose(); }
              }}
            />
            <TouchableOpacity
              style={[styles.pcLocationBtn, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}
              onPress={handleMyLocation}
              disabled={locating}
              activeOpacity={0.7}
            >
              {locating ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Ionicons name="navigate" size={18} color={colors.primary} />
              )}
            </TouchableOpacity>
          </View>
          <View style={styles.pcButtons}>
            <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
              <Text style={[styles.pcCancel, { color: colors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.pcSaveBtn, { backgroundColor: colors.primary }, !value.trim() && { opacity: 0.5 }]}
              disabled={!value.trim()}
              onPress={() => { onSave(value.trim()); onClose(); }}
              activeOpacity={0.7}
            >
              <Text style={styles.pcSaveText}>Save</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ── Props ──
interface NearbyStationsBarProps {
  stations: GasStation[];
  isLoading: boolean;
  error: string | null;
  selectedFuelType: string;
  distanceUnit: 'mi' | 'km';
  homeStationPlaceId: string | null;
  isPro: boolean;
  onSelectPrice: (price: number) => void;
  onToggleHome: (station: GasStation) => void;
  postalCode: string | null;
  onPostalCodeChange: (code: string) => void;
  onFuelTypeChange: (type: string) => void;
  /** When true, strips the card wrapper (background, shadow, margin) for embedding inside a parent card */
  embedded?: boolean;
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
  selectedFuelType,
  distanceUnit,
  homeStationPlaceId,
  isPro,
  onSelectPrice,
  onToggleHome,
  postalCode,
  onPostalCodeChange,
  onFuelTypeChange,
  embedded,
}: NearbyStationsBarProps) {
  const colors = useColors();
  const [expanded, setExpanded] = useState(false);
  const [pcModalVisible, setPcModalVisible] = useState(false);

  // Brief loading state when the fuel grade changes to avoid layout jitter
  const [transitioning, setTransitioning] = useState(false);
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    setTransitioning(true);
    const timer = setTimeout(() => setTransitioning(false), 300);
    return () => clearTimeout(timer);
  }, [selectedFuelType]);

  // Compact bar always shows distance-sorted stations (default from API)
  const visibleStations = useMemo(
    () => stations.filter((s) => s.fuelPrices.some((p) => p.fuelType === selectedFuelType)),
    [stations, selectedFuelType],
  );

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<GasStation>) => (
      <StationCard
        station={item}
        selectedFuelType={selectedFuelType}
        distanceUnit={distanceUnit}
        isHome={item.placeId === homeStationPlaceId}
        isPro={isPro}
        onSelectPrice={onSelectPrice}
        onToggleHome={() => onToggleHome(item)}
      />
    ),
    [selectedFuelType, distanceUnit, homeStationPlaceId, isPro, onSelectPrice, onToggleHome],
  );

  return (
    <View style={embedded ? styles.outerEmbedded : [styles.outer, { backgroundColor: colors.surface, shadowColor: colors.black }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="flame" size={22} color={colors.primary} />
          <Text style={[styles.headerTitle, { color: colors.text }]}>Nearby Stations</Text>
        </View>
        <TouchableOpacity style={styles.expandButton} onPress={() => setExpanded(true)} activeOpacity={0.7}>
          <Text style={[styles.expandText, { color: colors.primary }]}>Expand</Text>
          <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
            <Path d="M14 3h7v7M21 3l-8 8M10 21H3v-7M3 21l8-8" stroke={colors.primary} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </TouchableOpacity>
      </View>

      {/* Postal code subtitle */}
      <View style={styles.postalRow}>
        {postalCode ? (
          <>
            <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
            <Text style={[styles.postalText, { color: colors.textSecondary }]}>{postalCode}</Text>
            <TouchableOpacity onPress={() => setPcModalVisible(true)} activeOpacity={0.7}>
              <Text style={[styles.postalChange, { color: colors.primary }]}>Change</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity onPress={() => setPcModalVisible(true)} activeOpacity={0.7} style={styles.setZipRow}>
            <Ionicons name="location-outline" size={14} color={colors.primary} />
            <Text style={[styles.postalChange, { color: colors.primary }]}>Set zip code</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Content */}
      {transitioning ? (
        <View style={styles.centered}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      ) : isLoading && stations.length === 0 ? (
        <View style={styles.centered}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={[styles.centeredText, { color: colors.textSecondary }]}>Searching nearby...</Text>
        </View>
      ) : error && stations.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={24} color={colors.textTertiary} />
          <Text style={[styles.centeredText, { color: colors.textSecondary }]}>{error}</Text>
        </View>
      ) : visibleStations.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="pricetag-outline" size={24} color={colors.textTertiary} />
          <Text style={[styles.centeredText, { color: colors.textSecondary }]}>No prices for this fuel type</Text>
        </View>
      ) : (
        <FlatList
          horizontal
          data={visibleStations}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          getItemLayout={getItemLayout}
          showsHorizontalScrollIndicator={false}
          style={styles.cardScroll}
          contentContainerStyle={styles.cardList}
          removeClippedSubviews
        />
      )}

      {/* Expanded bottom sheet */}
      <StationListModal
        visible={expanded}
        stations={stations}
        selectedFuelType={selectedFuelType}
        distanceUnit={distanceUnit}
        homeStationPlaceId={homeStationPlaceId}
        isPro={isPro}
        onSelectPrice={onSelectPrice}
        onToggleHome={onToggleHome}
        onClose={() => setExpanded(false)}
        postalCode={postalCode}
        onPostalCodeChange={onPostalCodeChange}
        onFuelTypeChange={onFuelTypeChange}
      />

      {/* Postal code edit modal */}
      <PostalCodeModal
        visible={pcModalVisible}
        currentPostalCode={postalCode}
        onSave={onPostalCodeChange}
        onClose={() => setPcModalVisible(false)}
      />
    </View>
  );
}

export default React.memo(NearbyStationsBar);

const CIRCLE_SIZE = 52;

const styles = StyleSheet.create({
  outer: {
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  outerEmbedded: {
    paddingTop: spacing.md,
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
    fontSize: 16,
    fontWeight: '700',
  },
  expandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  expandText: {
    fontSize: 13,
    fontWeight: '600',
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    gap: 6,
    minHeight: CIRCLE_SIZE + spacing.sm + spacing.sm * 2 + 20 + 26 + 17, // match populated card list height
  },
  centeredText: {
    ...typography.caption,
    textAlign: 'center',
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
  brandLogo: {
    width: CIRCLE_SIZE - 8,
    height: CIRCLE_SIZE - 8,
    borderRadius: (CIRCLE_SIZE - 8) / 2,
    resizeMode: 'contain',
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
    borderRadius: 8,
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },

  // ── Centered text info ──
  cardName: {
    ...typography.label,
    fontSize: 12,
    textAlign: 'center',
    width: CARD_WIDTH,
    paddingHorizontal: 4,
  },
  cardPrice: {
    ...typography.h3,
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 2,
  },
  cardPriceNA: {
    ...typography.label,
    textAlign: 'center',
    marginTop: 2,
  },
  cardDistance: {
    ...typography.caption,
    fontSize: 11,
    textAlign: 'center',
    marginTop: 1,
  },

  // ── Modal ──
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: spacing.md,
    paddingBottom: 40,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  modalFuelPicker: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  modalFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  modalSortCapsule: {
    flexDirection: 'row',
    borderRadius: 20,
    padding: 3,
  },
  modalSortIndicator: {
    position: 'absolute',
    top: 3,
    bottom: 3,
    left: 0,
    borderRadius: 16,
  },
  modalSortPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 16,
  },
  modalSortLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  modalSortLabelActive: {
    color: '#FFFFFF',
  },
  modalSortDollar: {
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 16,
  },
  modalList: {
    flexGrow: 0,
  },
  modalListContent: {
    paddingHorizontal: spacing.lg,
  },

  // ── Postal code subtitle ──
  postalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: spacing.sm,
  },
  setZipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  postalText: {
    ...typography.caption,
    fontSize: 13,
  },
  postalChange: {
    fontSize: 13,
    fontWeight: '600',
  },

  // ── Modal postal box ──
  modalPostalBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 16,
  },
  modalPostalText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // ── Postal Code Modal ──
  pcOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pcCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    width: '85%',
    maxWidth: 340,
  },
  pcTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: spacing.md,
  },
  pcInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  pcInput: {
    borderRadius: borderRadius.sm + 2,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
  },
  pcInputFlex: {
    flex: 1,
  },
  pcLocationBtn: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.sm + 2,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pcButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 16,
  },
  pcCancel: {
    fontSize: 14,
    fontWeight: '600',
  },
  pcSaveBtn: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  pcSaveText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // ── Station row ──
  rowContainer: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm + 2,
  },
  rowActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingBottom: spacing.sm + 2,
  },
  rowActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    borderRadius: borderRadius.sm + 2,
  },
  rowActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  rowBrandWrapper: {
    marginRight: spacing.sm + 2,
  },
  rowInfo: {
    flex: 1,
    marginRight: spacing.sm,
  },
  rowName: {
    fontSize: 14,
    fontWeight: '700',
  },
  rowAddress: {
    ...typography.caption,
    marginTop: 2,
  },
  rowRight: {
    alignItems: 'flex-end',
  },
  rowPrice: {
    fontSize: 16,
    fontWeight: '700',
  },
  rowPriceNA: {
    fontSize: 14,
    fontWeight: '600',
  },
  rowDistance: {
    ...typography.caption,
    marginTop: 2,
  },
});

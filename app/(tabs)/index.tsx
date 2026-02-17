import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Modal,
  TextInput,
  Alert,
  Animated,
  Pressable,
  AppState,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import { useSessionStore } from '@/stores/sessionStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useAuthStore } from '@/stores/authStore';
import { useVehicleStore } from '@/stores/vehicleStore';
import type { Vehicle } from '@/services/vehicle/vehicleService';
import { calculateTripCost } from '@/services/fuel/fuelCalculator';
import { useTracking } from '@/hooks/useTracking';
import { useGasPrice } from '@/hooks/useGasPrice';
import { useHomeStation } from '@/hooks/useHomeStation';
import { useNearbyStations } from '@/hooks/useNearbyStations';
import { lastPriceRepository } from '@/db/repositories/lastPriceRepository';
import { formatDurationTimer, formatDistance, formatCurrency } from '@/utils/formatting';
import LocationModeModal from '@/components/session/LocationModeModal';
import NearbyStationsBar from '@/components/station/NearbyStationsBar';
import FuelTypePicker from '@/components/common/FuelTypePicker';
import RollingPrice from '@/components/common/RollingPrice';
import { useLocationPermission } from '@/hooks/useLocationPermission';
import { useSubscription } from '@/hooks/useSubscription';
import AdBanner from '@/components/common/AdBanner';
import { adUnits } from '@/config/adUnits';
import { useColors } from '@/theme/useColors';
import { colors as staticColors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing, borderRadius } from '@/theme/spacing';


// ═══════════════════════════════════════════════════════
// PARKED DASHBOARD
// ═══════════════════════════════════════════════════════
function ParkedDashboard({
  onStartDrive,
  gasPrice,
  onChangePrice,
  onSelectVehicle,
  vehicle,
  distanceUnit,
  volumeUnit,
  selectedFuelType,
  onChangeFuelType,
  homeStationName,
  priceSource,
  stations,
  stationsLoading,
  stationsError,
  homeStationPlaceId,
  isPro,
  onSelectStationPrice,
  onToggleHome,
  postalCode,
  onPostalCodeChange,
}: {
  onStartDrive: () => void;
  gasPrice: number;
  onChangePrice: (price: number) => void;
  onSelectVehicle: () => void;
  vehicle: Vehicle;
  distanceUnit: 'mi' | 'km';
  volumeUnit: 'gal' | 'l';
  selectedFuelType: string;
  onChangeFuelType: (grade: string) => void;
  homeStationName: string | null;
  priceSource: string;
  stations: import('@/services/places/placesService').GasStation[];
  stationsLoading: boolean;
  stationsError: string | null;
  homeStationPlaceId: string | null;
  isPro: boolean;
  onSelectStationPrice: (price: number) => void;
  onToggleHome: (station: import('@/services/places/placesService').GasStation) => void;
  postalCode: string | null;
  onPostalCodeChange: (code: string) => void;
}) {
  const colors = useColors();
  const router = useRouter();
  const [priceText, setPriceText] = useState(gasPrice.toFixed(3));
  const [isEditingPrice, setIsEditingPrice] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Sync displayed price when not editing
  useEffect(() => {
    if (!isEditingPrice) {
      setPriceText(gasPrice.toFixed(3));
    }
  }, [gasPrice]);

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 1200, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  return (
    <View style={styles.parkedContainer}>
      {/* A. Active Vehicle Card / Upgrade to Pro */}
      {isPro ? (
        <TouchableOpacity style={[styles.vehicleCard, { marginBottom: spacing.lg, backgroundColor: colors.surface, shadowColor: colors.black }]} activeOpacity={0.7} onPress={onSelectVehicle}>
          <View style={styles.vehicleInfo}>
            <Ionicons name="car-sport" size={28} color={colors.primary} />
            <View style={styles.vehicleText}>
              <Text style={[styles.vehicleLabel, { color: colors.textTertiary }]}>Active Vehicle</Text>
              <Text style={[styles.vehicleName, { color: colors.text }]}>
                {vehicle.year} {vehicle.make} {vehicle.model}
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={[styles.vehicleCard, { backgroundColor: colors.surface, shadowColor: colors.black }]} activeOpacity={0.7} onPress={() => router.push('/pro')}>
          <View style={styles.vehicleInfo}>
            <Ionicons name="star" size={28} color={colors.warning} />
            <View style={styles.vehicleText}>
              <Text style={[styles.vehicleName, { color: colors.text }]}>Upgrade to Pro</Text>
              <Text style={[styles.vehicleLabel, { color: colors.textTertiary }]}>Go ad-free & unlock all features</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
        </TouchableOpacity>
      )}

      <AdBanner unitId={adUnits.dashboardTop} style={{ marginTop: 0 }} />

      {/* Fuel / Price / Stations Card */}
      <View style={[styles.fuelPriceCard, { backgroundColor: colors.surface, shadowColor: colors.black }, !isPro && { marginBottom: spacing.sm }]}>
        {/* Fuel Grade Picker */}
        <FuelTypePicker selected={selectedFuelType} onSelect={onChangeFuelType} />

        <View style={[styles.fuelPriceDivider, { backgroundColor: colors.border }]} />

        {/* Est. Gas Price */}
        <View style={styles.priceRow}>
          <View style={styles.priceLeft}>
            <Ionicons name="pricetag" size={20} color={colors.warning} />
            <Text style={[styles.priceLabel, { color: colors.textSecondary }]}>Est. Gas Price</Text>
          </View>
          <View style={styles.priceRight}>
            <Text style={[styles.priceCurrency, { color: colors.text }]}>$</Text>
            {isEditingPrice ? (
              <TextInput
                style={[styles.priceInput, { color: colors.text }]}
                value={priceText}
                keyboardType="number-pad"
                returnKeyType="done"
                autoFocus
                selectTextOnFocus
                onChangeText={(raw) => {
                  const digits = raw.replace(/\D/g, '').slice(0, 4);
                  if (digits.length === 0) { setPriceText(''); return; }
                  if (digits.length === 1) { setPriceText(digits); return; }
                  setPriceText(`${digits[0]}.${digits.slice(1)}`);
                }}
                onEndEditing={() => {
                  const digits = priceText.replace(/\D/g, '').padEnd(4, '0').slice(0, 4);
                  const formatted = `${digits[0]}.${digits.slice(1, 4)}`;
                  const parsed = parseFloat(formatted);
                  if (!isNaN(parsed) && parsed > 0) {
                    onChangePrice(parsed);
                  }
                  setPriceText(parsed > 0 ? formatted : gasPrice.toFixed(3));
                  setIsEditingPrice(false);
                }}
                onBlur={() => setIsEditingPrice(false)}
              />
            ) : (
              <TouchableOpacity onPress={() => setIsEditingPrice(true)} activeOpacity={0.7}>
                <RollingPrice
                  value={gasPrice.toFixed(3)}
                  textStyle={{ ...styles.priceDigit, color: colors.text }}
                  height={24}
                  duration={250}
                />
              </TouchableOpacity>
            )}
            <Text style={[styles.priceUnit, { color: colors.text }]}>/{volumeUnit}</Text>
          </View>
        </View>
        {/* Nearby Stations */}
        <View style={[styles.fuelPriceDivider, { backgroundColor: colors.border }]} />
        <NearbyStationsBar
          stations={stations}
          isLoading={stationsLoading}
          error={stationsError}
          selectedFuelType={selectedFuelType}
          distanceUnit={distanceUnit}
          homeStationPlaceId={homeStationPlaceId}
          isPro={isPro}
          onSelectPrice={onSelectStationPrice}
          onToggleHome={onToggleHome}
          postalCode={postalCode}
          onPostalCodeChange={onPostalCodeChange}
          onFuelTypeChange={onChangeFuelType}
          embedded
        />
      </View>

      <AdBanner unitId={adUnits.dashboardBottom} style={{ marginTop: 0 }} />

      {/* C. Big Start Button */}
      <View style={styles.startButtonContainer}>
        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <TouchableOpacity style={[styles.startButton, { backgroundColor: colors.primary, shadowColor: colors.primary }]} onPress={onStartDrive} activeOpacity={0.8}>
            <Ionicons name="navigate" size={24} color="#FFFFFF" />
            <Text style={styles.startButtonText}>START DRIVE</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>

    </View>
  );
}

// ═══════════════════════════════════════════════════════
// ACTIVE DASHBOARD
// ═══════════════════════════════════════════════════════
function ActiveDashboard({
  onStop,
  vehicle,
  gasPrice,
}: {
  onStop: () => void;
  vehicle: Vehicle;
  gasPrice: number;
}) {
  const { distanceM, elapsedSeconds, gpsSignal, isTracking, isTrackingPaused } = useSessionStore();
  const updateStats = useSessionStore((s) => s.updateStats);
  const distanceUnit = useSettingsStore((s) => s.distanceUnit);
  const volumeUnit = useSettingsStore((s) => s.volumeUnit);

  // Live timer — ticks every second while tracking
  const startTimeRef = useRef(Date.now() - elapsedSeconds * 1000);

  useEffect(() => {
    if (!isTracking) return;
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      updateStats({ distanceM, stoppedSeconds: 0, elapsedSeconds: elapsed });
    }, 1000);
    return () => clearInterval(interval);
  }, [isTracking, distanceM]);

  // Dynamic trip cost from formula
  const tripCost = calculateTripCost(
    distanceM,
    vehicle.efficiency_value,
    vehicle.efficiency_unit,
    gasPrice,
    volumeUnit,
  );

  // Animated cost ticker
  const [displayCost, setDisplayCost] = useState(tripCost);

  useEffect(() => {
    const duration = 300;
    const startCost = displayCost;
    const endCost = tripCost;
    let startTime: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      setDisplayCost(startCost + (endCost - startCost) * progress);
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [tripCost]);

  const gpsColor = gpsSignal === 'good' ? staticColors.success : gpsSignal === 'weak' ? staticColors.warning : staticColors.error;
  const gpsLabel = gpsSignal === 'good' ? 'Strong GPS' : gpsSignal === 'weak' ? 'Weak Signal' : 'Signal Lost';

  const handleStop = () => {
    Alert.alert(
      'End Session?',
      'Are you sure you want to stop tracking this drive?',
      [
        { text: 'Keep Driving', style: 'cancel' },
        { text: 'Stop & Save', style: 'destructive', onPress: onStop },
      ],
    );
  };

  return (
    <View style={styles.activeContainer}>
      {/* D. GPS Trust Indicator */}
      <View style={styles.gpsBar}>
        <View style={[styles.gpsDot, { backgroundColor: gpsColor }]} />
        <Text style={[styles.gpsText, { color: gpsColor }]}>{gpsLabel}</Text>
      </View>

      {/* Tracking Paused Banner */}
      {isTrackingPaused && (
        <View style={styles.pausedBanner}>
          <Ionicons name="pause-circle" size={18} color="#92400E" />
          <Text style={styles.pausedBannerText}>Tracking Paused — GPS signal gap detected</Text>
        </View>
      )}

      {/* Vehicle context */}
      <Text style={styles.activeVehicle}>
        {vehicle.year} {vehicle.make} {vehicle.model}
      </Text>

      {/* A. The Taxi Meter */}
      <View style={styles.taxiMeter}>
        <Text style={styles.taxiLabel}>TRIP COST</Text>
        <Text style={styles.taxiCost}>{formatCurrency(displayCost)}</Text>
      </View>

      {/* B. Secondary Metrics */}
      <View style={styles.metricsRow}>
        <View style={styles.metricItem}>
          <Ionicons name="speedometer-outline" size={22} color={staticColors.textSecondary} />
          <Text style={styles.metricValue}>{formatDistance(distanceM, distanceUnit)}</Text>
          <Text style={styles.metricLabel}>Distance</Text>
        </View>
        <View style={styles.metricDivider} />
        <View style={styles.metricItem}>
          <Ionicons name="time-outline" size={22} color={staticColors.textSecondary} />
          <Text style={styles.metricValue}>{formatDurationTimer(elapsedSeconds)}</Text>
          <Text style={styles.metricLabel}>Duration</Text>
        </View>
      </View>

      {/* C. Stop Button */}
      <View style={styles.stopButtonContainer}>
        <TouchableOpacity
          style={styles.stopButton}
          onPress={handleStop}
          onLongPress={onStop}
          activeOpacity={0.8}
        >
          <Ionicons name="stop" size={32} color={staticColors.white} />
          <Text style={styles.stopButtonText}>STOP</Text>
        </TouchableOpacity>
        <Text style={styles.stopHint}>Tap to stop &middot; Long-press to skip confirmation</Text>
      </View>
    </View>
  );
}

// ═══════════════════════════════════════════════════════
// VEHICLE PICKER MODAL
// ═══════════════════════════════════════════════════════
function VehiclePickerModal({
  visible,
  vehicles,
  selectedId,
  onSelect,
  onClose,
}: {
  visible: boolean;
  vehicles: Vehicle[];
  selectedId: string;
  onSelect: (vehicle: Vehicle) => void;
  onClose: () => void;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="fade">
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={[styles.modalContent, { paddingBottom: Math.max(insets.bottom, 20) + 20, backgroundColor: colors.surface }]} onPress={() => {}}>
          <Text style={[styles.modalTitle, { color: colors.text }]}>Select Vehicle</Text>
          <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>Choose which vehicle you're driving</Text>
          <View style={styles.vehicleList}>
            {vehicles.map((v) => {
              const isSelected = v.id === selectedId;
              return (
                <TouchableOpacity
                  key={v.id}
                  style={[
                    styles.vehicleOption,
                    { borderColor: colors.border, backgroundColor: colors.surface },
                    isSelected && { borderColor: colors.primary, backgroundColor: colors.primaryBg },
                  ]}
                  activeOpacity={0.7}
                  onPress={() => onSelect(v)}
                >
                  <View style={styles.vehicleOptionLeft}>
                    <View style={[styles.vehicleRadio, { borderColor: colors.primary }]}>
                      {isSelected && <View style={[styles.vehicleRadioFill, { backgroundColor: colors.primary }]} />}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.vehicleOptionName, { color: colors.text }, isSelected && { color: colors.primary }]}>
                        {v.year} {v.make} {v.model}
                      </Text>
                      <Text style={[styles.vehicleOptionDetail, { color: colors.textTertiary }]}>
                        {v.efficiency_value > 0 ? `${v.efficiency_value} ${v.efficiency_unit.toUpperCase()}` : v.fuel_type}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// Persists the selected vehicle ID across component remounts (e.g. after
// router.replace from session summary). Lives outside React state so it
// survives full unmount/remount cycles within the same app session.
let _lastSelectedVehicleId: string | null = null;
const SELECTED_VEHICLE_KEY = 'gasledger_selected_vehicle_id';

// ═══════════════════════════════════════════════════════
// MAIN DASHBOARD SCREEN
// ═══════════════════════════════════════════════════════
export default function DashboardScreen() {
  const colors = useColors();
  const { activeSessionId } = useSessionStore();
  const distanceUnit = useSettingsStore((s) => s.distanceUnit);
  const volumeUnit = useSettingsStore((s) => s.volumeUnit);
  const session = useAuthStore((s) => s.session);
  const { startTracking, stopTracking } = useTracking();
  const locationMode = useSettingsStore((s) => s.locationMode);
  const setLocationMode = useSettingsStore((s) => s.setLocationMode);
  const postalCode = useSettingsStore((s) => s.postalCode);
  const setPostalCode = useSettingsStore((s) => s.setPostalCode);
  const { requestBackground } = useLocationPermission();
  const { isPro } = useSubscription();

  const [vehicleModalVisible, setVehicleModalVisible] = useState(false);
  const [locationModeModalVisible, setLocationModeModalVisible] = useState(false);
  const vehicles = useVehicleStore((s) => s.vehicles);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [selectedFuelType, setSelectedFuelType] = useState<string>('regular');

  const homeStation = useHomeStation(session?.user.id);
  const nearbyStations = useNearbyStations();

  // Refresh home station prices on mount if stale
  useEffect(() => {
    if (homeStation.isLoaded && homeStation.homeStation) {
      homeStation.refreshPrice();
    }
  }, [homeStation.isLoaded]);

  // Auto-fetch nearby stations on mount
  useEffect(() => {
    nearbyStations.refresh();
  }, []);

  // Re-fetch nearby stations when app returns to foreground
  // (e.g. after user grants location permission in system Settings)
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        nearbyStations.refresh();
      }
    });
    return () => sub.remove();
  }, []);

  const homeStationPrice = homeStation.getPriceForType(selectedFuelType);

  const { gasPrice, setGasPrice, priceSource } = useGasPrice(
    selectedFuelType,
    homeStationPrice,
  );

  // Refresh vehicles from Supabase on focus
  useFocusEffect(
    useCallback(() => {
      if (!session) return;
      useVehicleStore.getState().refreshVehicles(session.user.id);
    }, [session]),
  );

  // Derive selectedVehicle whenever vehicles change (from cache or refresh)
  useEffect(() => {
    if (vehicles.length === 0) {
      setSelectedVehicle(null);
      _lastSelectedVehicleId = null;
      SecureStore.deleteItemAsync(SELECTED_VEHICLE_KEY).catch(() => {});
      return;
    }
    (async () => {
      const storedId = await SecureStore.getItemAsync(SELECTED_VEHICLE_KEY);
      const rememberedId = _lastSelectedVehicleId ?? storedId;
      const match = rememberedId ? vehicles.find((v) => v.id === rememberedId) : null;
      if (match) {
        setSelectedVehicle(match);
      } else {
        setSelectedVehicle(vehicles[0]);
        setSelectedFuelType(vehicles[0].fuel_type || 'regular');
        _lastSelectedVehicleId = vehicles[0].id;
      }
    })();
  }, [vehicles]);

  // Sync fuel type and persist selection when vehicle changes
  useEffect(() => {
    if (selectedVehicle) {
      _lastSelectedVehicleId = selectedVehicle.id;
      SecureStore.setItemAsync(SELECTED_VEHICLE_KEY, selectedVehicle.id).catch(() => {});
      setSelectedFuelType(selectedVehicle.fuel_type || 'regular');
    }
  }, [selectedVehicle?.id]);

  const isActive = !!activeSessionId;

  const handleStartDrive = async () => {
    if (!selectedVehicle || !session) return;

    // Show location mode modal if user hasn't chosen yet
    if (locationMode === null) {
      setLocationModeModalVisible(true);
      return;
    }

    const result = await startTracking({
      userId: session.user.id,
      vehicleId: selectedVehicle.id,
      fuelType: selectedFuelType,
      gasPriceValue: gasPrice,
      gasPriceUnit: volumeUnit === 'gal' ? 'per_gal' : 'per_l',
      gasPriceCurrency: 'usd',
    });

    if (!result.success) {
      Alert.alert(
        'Location Permission Required',
        'GasLedger needs location access to track your driving session. Please enable it in Settings.',
      );
    }
  };

  const handleLocationModeSelected = async (mode: 'full' | 'limited') => {
    setLocationMode(mode);
    setLocationModeModalVisible(false);
    // Proceed to start drive after mode selection
    if (!selectedVehicle || !session) return;
    const result = await startTracking({
      userId: session.user.id,
      vehicleId: selectedVehicle.id,
      fuelType: selectedFuelType,
      gasPriceValue: gasPrice,
      gasPriceUnit: volumeUnit === 'gal' ? 'per_gal' : 'per_l',
      gasPriceCurrency: 'usd',
    });
    if (!result.success) {
      Alert.alert(
        'Location Permission Required',
        'GasLedger needs location access to track your driving session. Please enable it in Settings.',
      );
    }
  };

  const handleChangePrice = (price: number) => {
    setGasPrice(price);
    lastPriceRepository.upsert(
      selectedFuelType,
      price,
      volumeUnit === 'gal' ? 'per_gal' : 'per_l',
      'usd',
    ).catch(() => {});
  };

  const handlePostalCodeChange = useCallback((code: string) => {
    setPostalCode(code);
    // Clear cached postal so refresh will re-fetch
    SecureStore.deleteItemAsync('gasledger_last_station_search_postal').catch(() => {});
    setTimeout(() => nearbyStations.refresh(), 100);
  }, [setPostalCode, nearbyStations]);

  const handleStopDrive = async () => {
    if (!selectedVehicle) return;
    await stopTracking(selectedVehicle.efficiency_value, gasPrice);
  };

  if (!selectedVehicle) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ ...typography.body, color: colors.textSecondary }}>Loading vehicles...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }, isActive && styles.activeBackground]}>
      {isActive ? (
        <ActiveDashboard onStop={handleStopDrive} vehicle={selectedVehicle} gasPrice={gasPrice} />
      ) : (
        <ParkedDashboard
          onStartDrive={handleStartDrive}
          gasPrice={gasPrice}
          onChangePrice={handleChangePrice}
          onSelectVehicle={() => setVehicleModalVisible(true)}
          vehicle={selectedVehicle}
          distanceUnit={distanceUnit}
          volumeUnit={volumeUnit}
          selectedFuelType={selectedFuelType}
          onChangeFuelType={setSelectedFuelType}
          homeStationName={homeStation.homeStation?.name ?? null}
          priceSource={priceSource}
          stations={nearbyStations.stations}
          stationsLoading={nearbyStations.isLoading}
          stationsError={nearbyStations.error}
          homeStationPlaceId={homeStation.homeStation?.place_id ?? null}
          isPro={isPro}
          postalCode={postalCode}
          onPostalCodeChange={handlePostalCodeChange}
          onSelectStationPrice={handleChangePrice}
          onToggleHome={(station) => {
            if (station.placeId === homeStation.homeStation?.place_id) {
              homeStation.removeHome();
            } else {
              homeStation.setHome(station);
            }
          }}
        />
      )}

      <VehiclePickerModal
        visible={vehicleModalVisible}
        vehicles={vehicles}
        selectedId={selectedVehicle.id}
        onSelect={(v) => {
          setSelectedVehicle(v);
          setVehicleModalVisible(false);
        }}
        onClose={() => setVehicleModalVisible(false)}
      />

      <LocationModeModal
        visible={locationModeModalVisible}
        onSelect={handleLocationModeSelected}
        onClose={() => setLocationModeModalVisible(false)}
        requestBackgroundPermission={requestBackground}
      />

    </SafeAreaView>
  );
}

// ═══════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════
const styles = StyleSheet.create({
  container: { flex: 1 },
  activeBackground: { backgroundColor: '#0F172A' },
  scrollView: { flex: 1 },
  parkedContainer: { flex: 1, padding: spacing.lg, paddingBottom: 40 },
  parkedContent: { padding: spacing.lg, paddingBottom: 40 },

  // ── Vehicle Card ──
  vehicleCard: {
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  vehicleInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  vehicleText: { marginLeft: 10, flex: 1 },
  vehicleLabel: { ...typography.caption, fontSize: 11 },
  vehicleName: { ...typography.label },

  // ── Fuel / Price / Stations Card ──
  fuelPriceCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  fuelPriceDivider: {
    height: 1,
    marginVertical: spacing.md,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  priceLeft: { flexDirection: 'row', alignItems: 'center' },
  priceLabel: { ...typography.label, marginLeft: 8 },
  homeStationHint: { ...typography.caption, marginTop: spacing.xs, marginLeft: spacing.xs },
  priceRight: { flexDirection: 'row', alignItems: 'center' },
  priceCurrency: { ...typography.h3 },
  priceInput: { ...typography.h3, width: 62, padding: 0, textAlign: 'center', marginBottom: 2 },
  priceDigit: { ...typography.h3, textAlign: 'center' },
  priceUnit: { ...typography.h3 },

  // ── Start Button ──
  startButtonContainer: { alignItems: 'center', marginBottom: spacing.xl + 8 },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    paddingHorizontal: 80,
    borderRadius: borderRadius.lg,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  startButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 1,
  },


  // ═══ ACTIVE STATE (intentionally hardcoded dark colors) ═══
  activeContainer: { flex: 1, padding: spacing.lg, justifyContent: 'space-between' },

  // ── GPS Bar ──
  gpsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: spacing.sm,
  },
  gpsDot: { width: 10, height: 10, borderRadius: 5, marginRight: 6 },
  gpsText: { ...typography.caption, fontWeight: '600' },

  // ── Tracking Paused Banner ──
  pausedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
    gap: 8,
  },
  pausedBannerText: {
    ...typography.caption,
    color: '#92400E',
    fontWeight: '600',
    flex: 1,
  },

  // ── Active Vehicle ──
  activeVehicle: {
    ...typography.bodySmall,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: spacing.xl,
  },

  // ── Taxi Meter ──
  taxiMeter: { alignItems: 'center', marginBottom: spacing.xl },
  taxiLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 2,
    marginBottom: spacing.sm,
  },
  taxiCost: {
    fontSize: 64,
    fontWeight: '800',
    color: '#FFFFFF',
    fontVariant: ['tabular-nums'],
  },

  // ── Secondary Metrics ──
  metricsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  metricItem: { flex: 1, alignItems: 'center' },
  metricValue: { ...typography.h2, color: '#FFFFFF', marginTop: 6 },
  metricLabel: { ...typography.caption, color: '#64748B', marginTop: 2 },
  metricDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.1)' },

  // ── Stop Button ──
  stopButtonContainer: { alignItems: 'center', paddingBottom: spacing.lg },
  stopButton: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: staticColors.error,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: staticColors.error,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  stopButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginTop: 4,
    letterSpacing: 1,
  },
  stopHint: { ...typography.caption, color: '#475569', marginTop: spacing.sm },

  // ═══ VEHICLE PICKER ═══
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: spacing.lg,
  },
  modalTitle: { ...typography.h2, marginBottom: 4 },
  modalSubtitle: { ...typography.bodySmall, marginBottom: spacing.lg },
  vehicleList: { gap: 10 },
  vehicleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  vehicleOptionLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  vehicleRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  vehicleRadioFill: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  vehicleOptionName: { ...typography.label },
  vehicleOptionDetail: { ...typography.caption, marginTop: 1 },
});

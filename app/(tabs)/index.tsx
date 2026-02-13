import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSessionStore } from '@/stores/sessionStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useAuthStore } from '@/stores/authStore';
import { vehicleService, Vehicle } from '@/services/vehicle/vehicleService';
import { metersToMiles } from '@/services/fuel/unitConverter';
import { useTracking } from '@/hooks/useTracking';
import { useGasPrice } from '@/hooks/useGasPrice';
import { useHomeStation } from '@/hooks/useHomeStation';
import { useNearbyStations } from '@/hooks/useNearbyStations';
import { lastPriceRepository } from '@/db/repositories/lastPriceRepository';
import { formatDurationTimer, formatDistance, formatCurrency } from '@/utils/formatting';
import LocationModeModal from '@/components/session/LocationModeModal';
import NearbyStationsBar from '@/components/station/NearbyStationsBar';
import FuelTypePicker from '@/components/common/FuelTypePicker';
import { useStationStore } from '@/stores/stationStore';
import { useLocationPermission } from '@/hooks/useLocationPermission';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing, borderRadius } from '@/theme/spacing';

// Trip cost formula: (distance_miles / efficiency_mpg) * price_per_gallon
function calculateTripCost(distanceM: number, efficiencyMpg: number, gasPricePerGal: number): number {
  if (efficiencyMpg <= 0) return 0;
  const miles = metersToMiles(distanceM);
  const gallonsUsed = miles / efficiencyMpg;
  return gallonsUsed * gasPricePerGal;
}

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
  onSelectStationPrice,
  onToggleHome,
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
  onSelectStationPrice: (price: number) => void;
  onToggleHome: (station: import('@/services/places/placesService').GasStation) => void;
}) {
  const [priceText, setPriceText] = useState(gasPrice.toFixed(3));
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Sync displayed price when the hook returns a different price (e.g. grade changed)
  useEffect(() => {
    setPriceText(gasPrice.toFixed(3));
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
      {/* A. Active Vehicle Card */}
      <TouchableOpacity style={styles.vehicleCard} activeOpacity={0.7} onPress={onSelectVehicle}>
        <View style={styles.vehicleInfo}>
          <Ionicons name="car-sport" size={28} color={colors.primary} />
          <View style={styles.vehicleText}>
            <Text style={styles.vehicleLabel}>Active Vehicle</Text>
            <Text style={styles.vehicleName}>
              {vehicle.year} {vehicle.make} {vehicle.model}
            </Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
      </TouchableOpacity>

      {/* Fuel / Price / Stations Card */}
      <View style={styles.fuelPriceCard}>
        {/* Fuel Grade Picker */}
        <FuelTypePicker selected={selectedFuelType} onSelect={onChangeFuelType} />

        <View style={styles.fuelPriceDivider} />

        {/* Est. Gas Price */}
        <View style={styles.priceRow}>
          <View style={styles.priceLeft}>
            <Ionicons name="pricetag" size={20} color={colors.warning} />
            <Text style={styles.priceLabel}>Est. Gas Price</Text>
          </View>
          <View style={styles.priceRight}>
            <Text style={styles.priceCurrency}>$</Text>
            <TextInput
              style={styles.priceInput}
              value={priceText}
              keyboardType="number-pad"
              returnKeyType="done"
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
              }}
            />
            <Text style={styles.priceUnit}>/{volumeUnit}</Text>
          </View>
        </View>
        {priceSource === 'home_station' && homeStationName && (
          <Text style={styles.homeStationHint}>{homeStationName}</Text>
        )}

        {/* Nearby Stations */}
        <View style={styles.fuelPriceDivider} />
        <NearbyStationsBar
          stations={stations}
          isLoading={stationsLoading}
          error={stationsError}
          selectedFuelType={selectedFuelType}
          distanceUnit={distanceUnit}
          homeStationPlaceId={homeStationPlaceId}
          onSelectPrice={onSelectStationPrice}
          onToggleHome={onToggleHome}
          embedded
        />
      </View>

      {/* C. Big Start Button */}
      <View style={styles.startButtonContainer}>
        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <TouchableOpacity style={styles.startButton} onPress={onStartDrive} activeOpacity={0.8}>
            <Ionicons name="navigate" size={24} color={colors.white} />
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
  const tripCost = calculateTripCost(distanceM, vehicle.efficiency_value, gasPrice);

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

  const gpsColor = gpsSignal === 'good' ? colors.success : gpsSignal === 'weak' ? colors.warning : colors.error;
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
          <Ionicons name="speedometer-outline" size={22} color={colors.textSecondary} />
          <Text style={styles.metricValue}>{formatDistance(distanceM, distanceUnit)}</Text>
          <Text style={styles.metricLabel}>Distance</Text>
        </View>
        <View style={styles.metricDivider} />
        <View style={styles.metricItem}>
          <Ionicons name="time-outline" size={22} color={colors.textSecondary} />
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
          <Ionicons name="stop" size={32} color={colors.white} />
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
  return (
    <Modal visible={visible} transparent animationType="fade">
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={styles.modalContent} onPress={() => {}}>
          <Text style={styles.modalTitle}>Select Vehicle</Text>
          <Text style={styles.modalSubtitle}>Choose which vehicle you're driving</Text>
          <View style={styles.vehicleList}>
            {vehicles.map((v) => {
              const isSelected = v.id === selectedId;
              return (
                <TouchableOpacity
                  key={v.id}
                  style={[styles.vehicleOption, isSelected && styles.vehicleOptionSelected]}
                  activeOpacity={0.7}
                  onPress={() => onSelect(v)}
                >
                  <View style={styles.vehicleOptionLeft}>
                    <View style={styles.vehicleRadio}>
                      {isSelected && <View style={styles.vehicleRadioFill} />}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.vehicleOptionName, isSelected && styles.vehicleOptionNameSelected]}>
                        {v.year} {v.make} {v.model}
                      </Text>
                      <Text style={styles.vehicleOptionDetail}>
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

// ═══════════════════════════════════════════════════════
// MAIN DASHBOARD SCREEN
// ═══════════════════════════════════════════════════════
export default function DashboardScreen() {
  const { activeSessionId } = useSessionStore();
  const distanceUnit = useSettingsStore((s) => s.distanceUnit);
  const volumeUnit = useSettingsStore((s) => s.volumeUnit);
  const session = useAuthStore((s) => s.session);
  const { startTracking, stopTracking } = useTracking();
  const locationMode = useSettingsStore((s) => s.locationMode);
  const setLocationMode = useSettingsStore((s) => s.setLocationMode);
  const { requestBackground } = useLocationPermission();

  const [vehicleModalVisible, setVehicleModalVisible] = useState(false);
  const [locationModeModalVisible, setLocationModeModalVisible] = useState(false);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [selectedFuelType, setSelectedFuelType] = useState<string>('regular');

  const homeStation = useHomeStation(session?.user.id);
  const nearbyStations = useNearbyStations();

  const pendingSelection = useStationStore((s) => s.pendingSelection);
  const clearPendingSelection = useStationStore((s) => s.clearPendingSelection);

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

  const homeStationPrice = homeStation.getPriceForType(selectedFuelType);

  const { gasPrice, setGasPrice, priceSource } = useGasPrice(
    selectedFuelType,
    homeStationPrice,
  );

  // Load & refresh vehicle list on focus. Preserves current selection across
  // remounts (e.g. returning from session summary) using module-level variable.
  useFocusEffect(
    useCallback(() => {
      if (!session) return;
      vehicleService.getByUser(session.user.id).then((data) => {
        setVehicles(data);
        if (data.length === 0) {
          setSelectedVehicle(null);
          _lastSelectedVehicleId = null;
          return;
        }
        const rememberedId = _lastSelectedVehicleId;
        const match = rememberedId ? data.find((v) => v.id === rememberedId) : null;
        if (match) {
          setSelectedVehicle(match);
        } else {
          setSelectedVehicle(data[0]);
          setSelectedFuelType(data[0].fuel_type || 'regular');
          _lastSelectedVehicleId = data[0].id;
        }
      });
    }, [session]),
  );

  // Sync fuel type and persist selection when vehicle changes
  useEffect(() => {
    if (selectedVehicle) {
      _lastSelectedVehicleId = selectedVehicle.id;
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

  // Consume pending price selection from map
  useEffect(() => {
    if (!pendingSelection) return;
    const { price, fuelType } = pendingSelection;
    clearPendingSelection();

    const apply = async () => {
      // Persist first so useGasPrice finds it when the type changes
      await lastPriceRepository.upsert(
        fuelType,
        price,
        volumeUnit === 'gal' ? 'per_gal' : 'per_l',
        'usd',
      ).catch(() => {});

      if (fuelType !== selectedFuelType) {
        // Switching type triggers useGasPrice which reads the DB
        setSelectedFuelType(fuelType);
      } else {
        // Same grade — update price directly
        setGasPrice(price);
      }
    };
    apply();
  }, [pendingSelection]);

  const handleStopDrive = async () => {
    if (!selectedVehicle) return;
    await stopTracking(selectedVehicle.efficiency_value, gasPrice);
  };

  if (!selectedVehicle) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ ...typography.body, color: colors.textSecondary }}>Loading vehicles...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, isActive && styles.activeBackground]}>
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
  container: { flex: 1, backgroundColor: colors.background },
  activeBackground: { backgroundColor: '#0F172A' },
  scrollView: { flex: 1 },
  parkedContainer: { flex: 1, padding: spacing.lg, paddingBottom: 40 },
  parkedContent: { padding: spacing.lg, paddingBottom: 40 },

  // ── Vehicle Card ──
  vehicleCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  vehicleInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  vehicleText: { marginLeft: 12, flex: 1 },
  vehicleLabel: { ...typography.caption, color: colors.textTertiary },
  vehicleName: { ...typography.h3, color: colors.text },

  // ── Fuel / Price / Stations Card ──
  fuelPriceCard: {
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
  fuelPriceDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  priceLeft: { flexDirection: 'row', alignItems: 'center' },
  priceLabel: { ...typography.label, color: colors.textSecondary, marginLeft: 8 },
  homeStationHint: { ...typography.caption, color: colors.primary, marginTop: spacing.xs, marginLeft: spacing.xs },
  priceRight: { flexDirection: 'row', alignItems: 'center' },
  priceCurrency: { ...typography.h3, color: colors.text },
  priceInput: { ...typography.h3, color: colors.text, width: 62, padding: 0, textAlign: 'center', marginBottom: 2 },
  priceUnit: { ...typography.h3, color: colors.text },

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
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  startButtonText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 1,
  },


  // ═══ ACTIVE STATE ═══
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
    color: colors.white,
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
  metricValue: { ...typography.h2, color: colors.white, marginTop: 6 },
  metricLabel: { ...typography.caption, color: '#64748B', marginTop: 2 },
  metricDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.1)' },

  // ── Stop Button ──
  stopButtonContainer: { alignItems: 'center', paddingBottom: spacing.lg },
  stopButton: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: colors.error,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.error,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  stopButtonText: {
    color: colors.white,
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
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: spacing.lg,
    paddingBottom: 40,
  },
  modalTitle: { ...typography.h2, color: colors.text, marginBottom: 4 },
  modalSubtitle: { ...typography.bodySmall, color: colors.textSecondary, marginBottom: spacing.lg },
  vehicleList: { gap: 10 },
  vehicleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  vehicleOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: '#EFF6FF',
  },
  vehicleOptionLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  vehicleRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  vehicleRadioFill: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  vehicleOptionName: { ...typography.label, color: colors.text },
  vehicleOptionNameSelected: { color: colors.primary },
  vehicleOptionDetail: { ...typography.caption, color: colors.textTertiary, marginTop: 1 },
});

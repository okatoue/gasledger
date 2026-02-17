import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
  Alert,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColors } from '@/theme/useColors';
import { typography } from '@/theme/typography';
import { spacing, borderRadius } from '@/theme/spacing';
import { vehicleService } from '@/services/vehicle/vehicleService';
import { useAuthStore } from '@/stores/authStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useLocationPermission } from '@/hooks/useLocationPermission';
import { supabase } from '@/config/supabase';
import { decodeVin, VinResult } from '@/services/vehicle/vinDecoder';
import { useFuelEconomyLookup } from '@/hooks/useFuelEconomyLookup';
import { normalizeFuelInfo } from '@/services/vehicle/fuelEconomyApi';
import DropdownPicker from '@/components/common/Select';

type Tab = 'scan' | 'manual';

export default function OnboardingScreen() {
  const colors = useColors();
  const [step, setStep] = useState<2 | 3>(2);
  const [activeTab, setActiveTab] = useState<Tab>('scan');
  const [vin, setVin] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDecoding, setIsDecoding] = useState(false);
  const [vinResult, setVinResult] = useState<VinResult | null>(null);
  const [vinError, setVinError] = useState('');
  const session = useAuthStore((s) => s.session);
  const setNeedsOnboarding = useAuthStore((s) => s.setNeedsOnboarding);
  const setRouteStorageEnabled = useSettingsStore((s) => s.setRouteStorageEnabled);
  const setLocationMode = useSettingsStore((s) => s.setLocationMode);
  const setPostalCode = useSettingsStore((s) => s.setPostalCode);
  const routeStorageEnabled = useSettingsStore((s) => s.routeStorageEnabled);
  const { requestBackground } = useLocationPermission();

  // Step 3 state
  const [step3PostalCode, setStep3PostalCode] = useState('');
  const [step3RouteStorage, setStep3RouteStorage] = useState(true);
  const [step3LocationMode, setStep3LocationMode] = useState<'full' | 'limited'>('full');
  const [isFinishing, setIsFinishing] = useState(false);

  const fuelLookup = useFuelEconomyLookup();

  const handleVinChange = (text: string) => {
    let cleaned = text.replace(/[^a-zA-Z0-9]/g, '');
    cleaned = cleaned.toUpperCase();
    if (cleaned.length > 17) return;
    setVin(cleaned);
    if (cleaned.length < 17) {
      setVinResult(null);
      setVinError('');
    }
  };

  useEffect(() => {
    if (vin.length !== 17) return;
    let cancelled = false;
    setIsDecoding(true);
    setVinError('');
    setVinResult(null);

    decodeVin(vin)
      .then((result) => {
        if (cancelled) return;
        if (result) {
          setVinResult(result);
        } else {
          setVinError('Could not decode this VIN. Check it and try again, or enter details manually.');
        }
      })
      .catch(() => {
        if (!cancelled) setVinError('Network error. Check your connection and try again.');
      })
      .finally(() => {
        if (!cancelled) setIsDecoding(false);
      });

    return () => { cancelled = true; };
  }, [vin]);

  const handleYearChange = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, '').slice(0, 4);
    fuelLookup.setYear(cleaned);
  };

  const isFormValid = activeTab === 'scan'
    ? vin.length === 17 && !isDecoding
    : fuelLookup.vehicleDetails !== null;

  const handleSave = async () => {
    // Use store session, but fall back to a fresh Supabase session if store is stale
    const currentSession = session ?? (await supabase.auth.getSession()).data.session;
    if (!currentSession) {
      Alert.alert('Session Expired', 'Please sign in again.');
      return;
    }
    setIsSaving(true);
    try {
      if (activeTab === 'scan') {
        const decoded = vinResult ?? await decodeVin(vin);
        if (!decoded) {
          Alert.alert('Error', 'Could not decode VIN. Try entering details manually.');
          return;
        }
        await vehicleService.create({
          user_id: currentSession.user.id,
          vin,
          make: decoded.make,
          model: decoded.model,
          year: decoded.year,
          fuel_type: decoded.fuelType,
        });
      } else {
        const details = fuelLookup.vehicleDetails!;
        const { fuelType } = normalizeFuelInfo(details.fuelType1);
        await vehicleService.create({
          user_id: currentSession.user.id,
          make: details.make,
          model: details.model,
          year: details.year,
          fuel_type: fuelType,
          efficiency_value: details.comb08,
          efficiency_unit: 'mpg',
          efficiency_source: 'fueleconomy.gov',
        });
      }
      setStep(3);
    } catch (error) {
      Alert.alert('Error', 'Failed to save vehicle. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleFinishOnboarding = async () => {
    setIsFinishing(true);
    try {
      setPostalCode(step3PostalCode.trim());
      setRouteStorageEnabled(step3RouteStorage);
      setLocationMode(step3LocationMode);
      if (step3LocationMode === 'full') {
        await requestBackground().catch(() => {});
      }
      setNeedsOnboarding(false);
    } catch (error) {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setIsFinishing(false);
    }
  };

  return (
    <Pressable style={{ flex: 1 }} onPress={Keyboard.dismiss}>
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.progressBar}>
              <View style={[styles.progressStep, { backgroundColor: colors.border }, { backgroundColor: colors.primary }]} />
              <View style={[styles.progressStep, { backgroundColor: colors.border }, { backgroundColor: colors.primary }]} />
              <View style={[styles.progressStep, { backgroundColor: colors.border }, step === 3 && { backgroundColor: colors.primary }]} />
            </View>
            {step === 2 ? (
              <>
                <Text style={[styles.title, { color: colors.text }]}>Let's set up your ride.</Text>
                <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                  We need your vehicle details to calculate your exact gas mileage.
                </Text>
              </>
            ) : (
              <>
                <Text style={[styles.title, { color: colors.text }]}>Almost done!</Text>
                <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                  Choose your privacy and tracking preferences.
                </Text>
              </>
            )}
          </View>

          {step === 2 ? (
            <>
              {/* Option 1: VIN */}
              <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, shadowColor: colors.black }, activeTab === 'scan' && { borderColor: colors.primary, borderWidth: 2 }]}>
                <TouchableOpacity
                  style={styles.cardHeader}
                  onPress={() => setActiveTab('scan')}
                >
                  <View style={[styles.radioCircle, { borderColor: colors.primary }]}>
                    {activeTab === 'scan' && <View style={[styles.selectedRb, { backgroundColor: colors.primary }]} />}
                  </View>
                  <Text style={[styles.cardTitle, { color: colors.text }]}>Use VIN Number</Text>
                </TouchableOpacity>

                {activeTab === 'scan' && (
                  <View style={styles.cardBody}>
                    <TouchableOpacity style={[styles.cameraButton, { backgroundColor: colors.text }]}>
                      <Ionicons name="camera-outline" size={24} color={colors.white} />
                      <Text style={[styles.cameraButtonText, { color: colors.white }]}>Scan Barcode</Text>
                    </TouchableOpacity>

                    <View style={styles.divider}>
                      <Text style={[styles.dividerText, { color: colors.textTertiary }]}>OR TYPE MANUALLY</Text>
                    </View>

                    <Text style={[styles.label, { color: colors.text }]}>Vehicle Identification Number (VIN)</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, color: colors.text }]}
                      placeholder="e.g. 1HGCM..."
                      placeholderTextColor={colors.textTertiary}
                      value={vin}
                      onChangeText={handleVinChange}
                      maxLength={17}
                      autoCorrect={false}
                      autoCapitalize="characters"
                    />
                    <Text style={[styles.helperText, { color: colors.textSecondary }]}>
                      {vin.length}/17 characters
                    </Text>

                    {isDecoding && (
                      <View style={styles.decodeStatus}>
                        <ActivityIndicator size="small" color={colors.primary} />
                        <Text style={[styles.decodeStatusText, { color: colors.textSecondary }]}>Decoding VIN...</Text>
                      </View>
                    )}

                    {vinError !== '' && (
                      <View style={styles.decodeStatus}>
                        <Ionicons name="alert-circle" size={18} color={colors.error} />
                        <Text style={[styles.decodeStatusText, { color: colors.error }]}>{vinError}</Text>
                      </View>
                    )}

                    {vinResult && (
                      <View style={[styles.vinResultCard, { backgroundColor: colors.surfaceSecondary }]}>
                        <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                        <View style={{ marginLeft: 10, flex: 1 }}>
                          <Text style={[styles.vinResultTitle, { color: colors.text }]}>
                            {vinResult.year} {vinResult.make} {vinResult.model}
                          </Text>
                          <Text style={[styles.vinResultSub, { color: colors.textSecondary }]}>
                            Fuel: {vinResult.fuelType}
                          </Text>
                        </View>
                      </View>
                    )}
                  </View>
                )}
              </View>

              {/* Option 2: Manual Entry */}
              <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, shadowColor: colors.black }, activeTab === 'manual' && { borderColor: colors.primary, borderWidth: 2 }]}>
                <TouchableOpacity
                  style={styles.cardHeader}
                  onPress={() => setActiveTab('manual')}
                >
                  <View style={[styles.radioCircle, { borderColor: colors.primary }]}>
                    {activeTab === 'manual' && <View style={[styles.selectedRb, { backgroundColor: colors.primary }]} />}
                  </View>
                  <Text style={[styles.cardTitle, { color: colors.text }]}>Enter Make & Model</Text>
                </TouchableOpacity>

                {activeTab === 'manual' && (
                  <View style={styles.cardBody}>
                    {/* Year — full width */}
                    <Text style={[styles.label, { color: colors.text }]}>Year</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, color: colors.text }]}
                      placeholder="2024"
                      placeholderTextColor={colors.textTertiary}
                      keyboardType="numeric"
                      maxLength={4}
                      value={fuelLookup.year}
                      onChangeText={handleYearChange}
                    />

                    {/* Make dropdown */}
                    <DropdownPicker
                      label="Make"
                      placeholder="Select make..."
                      items={fuelLookup.makes}
                      selectedValue={fuelLookup.selectedMake?.value ?? null}
                      onSelect={fuelLookup.selectMake}
                      disabled={fuelLookup.makes.length === 0 && !fuelLookup.makeLoading}
                      loading={fuelLookup.makeLoading}
                      error={fuelLookup.makeError}
                    />

                    {/* Model dropdown */}
                    <DropdownPicker
                      label="Model"
                      placeholder="Select model..."
                      items={fuelLookup.models}
                      selectedValue={fuelLookup.selectedModel?.value ?? null}
                      onSelect={fuelLookup.selectModel}
                      disabled={fuelLookup.selectedMake === null && !fuelLookup.modelLoading}
                      loading={fuelLookup.modelLoading}
                      error={fuelLookup.modelError}
                    />

                    {/* Trim / Engine dropdown */}
                    <DropdownPicker
                      label="Trim / Engine"
                      placeholder="Select trim..."
                      items={fuelLookup.options}
                      selectedValue={fuelLookup.selectedOption?.value ?? null}
                      onSelect={fuelLookup.selectOption}
                      disabled={fuelLookup.selectedModel === null && !fuelLookup.optionLoading}
                      loading={fuelLookup.optionLoading}
                      error={fuelLookup.optionError}
                    />

                    {/* Vehicle details confirmation card */}
                    {fuelLookup.detailLoading && (
                      <View style={styles.decodeStatus}>
                        <ActivityIndicator size="small" color={colors.primary} />
                        <Text style={[styles.decodeStatusText, { color: colors.textSecondary }]}>Loading vehicle data...</Text>
                      </View>
                    )}

                    {fuelLookup.detailError !== '' && (
                      <View style={styles.decodeStatus}>
                        <Ionicons name="alert-circle" size={18} color={colors.error} />
                        <Text style={[styles.decodeStatusText, { color: colors.error }]}>
                          {fuelLookup.detailError}
                        </Text>
                      </View>
                    )}

                    {fuelLookup.vehicleDetails && (
                      <View style={[styles.vinResultCard, { backgroundColor: colors.surfaceSecondary }]}>
                        <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                        <View style={{ marginLeft: 10, flex: 1 }}>
                          <Text style={[styles.vinResultTitle, { color: colors.text }]}>
                            {fuelLookup.vehicleDetails.year} {fuelLookup.vehicleDetails.make}{' '}
                            {fuelLookup.vehicleDetails.model}
                          </Text>
                          <Text style={[styles.vinResultSub, { color: colors.textSecondary }]}>
                            Combined: {fuelLookup.vehicleDetails.comb08} MPG {'  '}
                            Fuel: {normalizeFuelInfo(fuelLookup.vehicleDetails.fuelType1).fuelType}
                          </Text>
                        </View>
                      </View>
                    )}
                  </View>
                )}
              </View>
            </>
          ) : (
            <>
              {/* Step 3: Postal Code */}
              <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, shadowColor: colors.black }]}>
                <View style={styles.step3ToggleRow}>
                  <View style={styles.step3ToggleInfo}>
                    <Ionicons name="location-outline" size={20} color={colors.primary} />
                    <View style={styles.step3ToggleTextWrapper}>
                      <Text style={[styles.step3ToggleLabel, { color: colors.text }]}>Your Zip / Postal Code</Text>
                      <Text style={[styles.step3ToggleHint, { color: colors.textTertiary }]}>
                        Used to find gas stations near you
                      </Text>
                    </View>
                  </View>
                </View>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, color: colors.text, marginTop: spacing.sm, marginBottom: 0 }]}
                  placeholder="e.g. 90210"
                  placeholderTextColor={colors.textTertiary}
                  value={step3PostalCode}
                  onChangeText={setStep3PostalCode}
                  autoCorrect={false}
                  autoCapitalize="characters"
                />
              </View>

              {/* Route Storage toggle */}
              <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, shadowColor: colors.black }]}>
                <View style={styles.step3ToggleRow}>
                  <View style={styles.step3ToggleInfo}>
                    <Ionicons name="navigate-outline" size={20} color={colors.primary} />
                    <View style={styles.step3ToggleTextWrapper}>
                      <Text style={[styles.step3ToggleLabel, { color: colors.text }]}>Route Storage</Text>
                      <Text style={[styles.step3ToggleHint, { color: colors.textTertiary }]}>
                        Save GPS route points with each session for detailed trip maps
                      </Text>
                    </View>
                  </View>
                  <Switch
                    value={step3RouteStorage}
                    onValueChange={setStep3RouteStorage}
                    trackColor={{ false: colors.border, true: colors.primaryLight }}
                    thumbColor={step3RouteStorage ? colors.primary : colors.textTertiary}
                  />
                </View>
              </View>

              <Text style={[styles.step3SectionLabel, { color: colors.text }]}>Location Tracking Mode</Text>

              <TouchableOpacity
                style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, shadowColor: colors.black }, step3LocationMode === 'full' && { borderColor: colors.primary, borderWidth: 2 }]}
                onPress={() => setStep3LocationMode('full')}
                activeOpacity={0.7}
              >
                <View style={styles.cardHeader}>
                  <View style={[styles.radioCircle, { borderColor: colors.primary }]}>
                    {step3LocationMode === 'full' && <View style={[styles.selectedRb, { backgroundColor: colors.primary }]} />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={[styles.cardTitle, { color: colors.text }]}>Full Tracking</Text>
                      <View style={[styles.recommendedBadge, { backgroundColor: colors.primaryLight }]}>
                        <Text style={[styles.recommendedText, { color: colors.white }]}>Recommended</Text>
                      </View>
                    </View>
                    <Text style={[styles.step3OptionDesc, { color: colors.textSecondary }]}>
                      Tracks your drive reliably in the background, even when the screen is off
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, shadowColor: colors.black }, step3LocationMode === 'limited' && { borderColor: colors.primary, borderWidth: 2 }]}
                onPress={() => setStep3LocationMode('limited')}
                activeOpacity={0.7}
              >
                <View style={styles.cardHeader}>
                  <View style={[styles.radioCircle, { borderColor: colors.primary }]}>
                    {step3LocationMode === 'limited' && <View style={[styles.selectedRb, { backgroundColor: colors.primary }]} />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.cardTitle, { color: colors.text }]}>Limited Mode</Text>
                    <Text style={[styles.step3OptionDesc, { color: colors.textSecondary }]}>
                      May pause tracking when the app goes to the background
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>

        {/* Sticky Footer */}
        <SafeAreaView edges={['bottom']} style={[styles.footer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
          {step === 2 ? (
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: colors.primary }, (!isFormValid || isSaving) && { backgroundColor: colors.primaryLight }]}
              disabled={!isFormValid || isSaving}
              onPress={handleSave}
            >
              <Text style={[styles.primaryButtonText, { color: colors.white }]}>{isSaving ? 'Saving...' : 'Save & Continue'}</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: colors.primary }, (isFinishing || !step3PostalCode.trim()) && { backgroundColor: colors.primaryLight }]}
              disabled={isFinishing || !step3PostalCode.trim()}
              onPress={handleFinishOnboarding}
            >
              <Text style={[styles.primaryButtonText, { color: colors.white }]}>{isFinishing ? 'Setting up...' : 'Get Started'}</Text>
            </TouchableOpacity>
          )}
        </SafeAreaView>
      </KeyboardAvoidingView>
    </SafeAreaView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: spacing.lg, paddingBottom: spacing.lg },

  // Header
  header: { marginBottom: spacing.xl },
  progressBar: { flexDirection: 'row', marginBottom: 20 },
  progressStep: {
    width: 30,
    height: 4,
    borderRadius: 2,
    marginRight: spacing.sm,
  },
  title: { ...typography.h1, marginBottom: spacing.sm },
  subtitle: { ...typography.body, lineHeight: 24 },

  // Cards
  card: {
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  cardTitle: { ...typography.h3, marginLeft: 12 },
  cardBody: { marginTop: spacing.md, paddingLeft: 34 },

  // Radio Button
  radioCircle: {
    height: 22,
    width: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedRb: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },

  // Inputs
  input: {
    borderRadius: borderRadius.sm + 2,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  label: { ...typography.label, marginBottom: spacing.xs + 2 },
  helperText: { ...typography.caption, textAlign: 'right', marginTop: -8 },

  // Camera Button
  cameraButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: borderRadius.md,
    marginBottom: 20,
  },
  cameraButtonText: {
    fontWeight: '600',
    marginLeft: spacing.sm,
    fontSize: 16,
  },

  // Divider
  divider: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  dividerText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },

  // Footer
  footer: {
    padding: spacing.lg,
    borderTopWidth: 1,
  },
  primaryButton: {
    paddingVertical: spacing.md,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButtonText: { fontSize: 18, fontWeight: '600' },

  row: { flexDirection: 'row' },

  // VIN decode
  decodeStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  decodeStatusText: {
    ...typography.caption,
    marginLeft: spacing.sm,
    flex: 1,
  },
  vinResultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.md,
  },
  vinResultTitle: {
    ...typography.body,
    fontWeight: '600',
  },
  vinResultSub: {
    ...typography.caption,
    marginTop: 2,
  },

  // Step 3 styles
  step3ToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  step3ToggleInfo: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: spacing.md },
  step3ToggleTextWrapper: { marginLeft: spacing.sm + 2, flex: 1 },
  step3ToggleLabel: { ...typography.label },
  step3ToggleHint: { ...typography.caption, marginTop: 2 },
  step3SectionLabel: { ...typography.label, marginBottom: spacing.sm, marginTop: spacing.sm },
  step3OptionDesc: { ...typography.caption, marginTop: 4, marginLeft: 34 },
  recommendedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  recommendedText: { fontSize: 11, fontWeight: '600' },
});

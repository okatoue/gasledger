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
import { colors } from '@/theme/colors';
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
  const routeStorageEnabled = useSettingsStore((s) => s.routeStorageEnabled);
  const { requestBackground } = useLocationPermission();

  // Step 3 state
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
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.progressBar}>
              <View style={[styles.progressStep, styles.activeStep]} />
              <View style={[styles.progressStep, styles.activeStep]} />
              <View style={[styles.progressStep, step === 3 && styles.activeStep]} />
            </View>
            {step === 2 ? (
              <>
                <Text style={styles.title}>Let's set up your ride.</Text>
                <Text style={styles.subtitle}>
                  We need your vehicle details to calculate your exact gas mileage.
                </Text>
              </>
            ) : (
              <>
                <Text style={styles.title}>Almost done!</Text>
                <Text style={styles.subtitle}>
                  Choose your privacy and tracking preferences.
                </Text>
              </>
            )}
          </View>

          {step === 2 ? (
            <>
              {/* Option 1: VIN */}
              <View style={[styles.card, activeTab === 'scan' && styles.activeCard]}>
                <TouchableOpacity
                  style={styles.cardHeader}
                  onPress={() => setActiveTab('scan')}
                >
                  <View style={styles.radioCircle}>
                    {activeTab === 'scan' && <View style={styles.selectedRb} />}
                  </View>
                  <Text style={styles.cardTitle}>Use VIN Number</Text>
                </TouchableOpacity>

                {activeTab === 'scan' && (
                  <View style={styles.cardBody}>
                    <TouchableOpacity style={styles.cameraButton}>
                      <Ionicons name="camera-outline" size={24} color={colors.white} />
                      <Text style={styles.cameraButtonText}>Scan Barcode</Text>
                    </TouchableOpacity>

                    <View style={styles.divider}>
                      <Text style={styles.dividerText}>OR TYPE MANUALLY</Text>
                    </View>

                    <Text style={styles.label}>Vehicle Identification Number (VIN)</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="e.g. 1HGCM..."
                      placeholderTextColor={colors.textTertiary}
                      value={vin}
                      onChangeText={handleVinChange}
                      maxLength={17}
                      autoCorrect={false}
                      autoCapitalize="characters"
                    />
                    <Text style={styles.helperText}>
                      {vin.length}/17 characters
                    </Text>

                    {isDecoding && (
                      <View style={styles.decodeStatus}>
                        <ActivityIndicator size="small" color={colors.primary} />
                        <Text style={styles.decodeStatusText}>Decoding VIN...</Text>
                      </View>
                    )}

                    {vinError !== '' && (
                      <View style={styles.decodeStatus}>
                        <Ionicons name="alert-circle" size={18} color={colors.error} />
                        <Text style={[styles.decodeStatusText, { color: colors.error }]}>{vinError}</Text>
                      </View>
                    )}

                    {vinResult && (
                      <View style={styles.vinResultCard}>
                        <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                        <View style={{ marginLeft: 10, flex: 1 }}>
                          <Text style={styles.vinResultTitle}>
                            {vinResult.year} {vinResult.make} {vinResult.model}
                          </Text>
                          <Text style={styles.vinResultSub}>
                            Fuel: {vinResult.fuelType}
                          </Text>
                        </View>
                      </View>
                    )}
                  </View>
                )}
              </View>

              {/* Option 2: Manual Entry */}
              <View style={[styles.card, activeTab === 'manual' && styles.activeCard]}>
                <TouchableOpacity
                  style={styles.cardHeader}
                  onPress={() => setActiveTab('manual')}
                >
                  <View style={styles.radioCircle}>
                    {activeTab === 'manual' && <View style={styles.selectedRb} />}
                  </View>
                  <Text style={styles.cardTitle}>Enter Make & Model</Text>
                </TouchableOpacity>

                {activeTab === 'manual' && (
                  <View style={styles.cardBody}>
                    {/* Year — full width */}
                    <Text style={styles.label}>Year</Text>
                    <TextInput
                      style={styles.input}
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
                        <Text style={styles.decodeStatusText}>Loading vehicle data...</Text>
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
                      <View style={styles.vinResultCard}>
                        <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                        <View style={{ marginLeft: 10, flex: 1 }}>
                          <Text style={styles.vinResultTitle}>
                            {fuelLookup.vehicleDetails.year} {fuelLookup.vehicleDetails.make}{' '}
                            {fuelLookup.vehicleDetails.model}
                          </Text>
                          <Text style={styles.vinResultSub}>
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
              {/* Step 3: Route Storage + Location Mode */}
              <View style={styles.card}>
                <View style={styles.step3ToggleRow}>
                  <View style={styles.step3ToggleInfo}>
                    <Ionicons name="navigate-outline" size={20} color={colors.primary} />
                    <View style={styles.step3ToggleTextWrapper}>
                      <Text style={styles.step3ToggleLabel}>Route Storage</Text>
                      <Text style={styles.step3ToggleHint}>
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

              <Text style={styles.step3SectionLabel}>Location Tracking Mode</Text>

              <TouchableOpacity
                style={[styles.card, step3LocationMode === 'full' && styles.activeCard]}
                onPress={() => setStep3LocationMode('full')}
                activeOpacity={0.7}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.radioCircle}>
                    {step3LocationMode === 'full' && <View style={styles.selectedRb} />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={styles.cardTitle}>Full Tracking</Text>
                      <View style={styles.recommendedBadge}>
                        <Text style={styles.recommendedText}>Recommended</Text>
                      </View>
                    </View>
                    <Text style={styles.step3OptionDesc}>
                      Tracks your drive reliably in the background, even when the screen is off
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.card, step3LocationMode === 'limited' && styles.activeCard]}
                onPress={() => setStep3LocationMode('limited')}
                activeOpacity={0.7}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.radioCircle}>
                    {step3LocationMode === 'limited' && <View style={styles.selectedRb} />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>Limited Mode</Text>
                    <Text style={styles.step3OptionDesc}>
                      May pause tracking when the app goes to the background
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>

        {/* Sticky Footer */}
        <SafeAreaView edges={['bottom']} style={styles.footer}>
          {step === 2 ? (
            <TouchableOpacity
              style={[styles.primaryButton, (!isFormValid || isSaving) && styles.disabledButton]}
              disabled={!isFormValid || isSaving}
              onPress={handleSave}
            >
              <Text style={styles.primaryButtonText}>{isSaving ? 'Saving...' : 'Save & Continue'}</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.primaryButton, isFinishing && styles.disabledButton]}
              disabled={isFinishing}
              onPress={handleFinishOnboarding}
            >
              <Text style={styles.primaryButtonText}>{isFinishing ? 'Setting up...' : 'Get Started'}</Text>
            </TouchableOpacity>
          )}
        </SafeAreaView>
      </KeyboardAvoidingView>
    </SafeAreaView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { padding: spacing.lg, paddingBottom: spacing.lg },

  // Header
  header: { marginBottom: spacing.xl },
  progressBar: { flexDirection: 'row', marginBottom: 20 },
  progressStep: {
    width: 30,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginRight: spacing.sm,
  },
  activeStep: { backgroundColor: colors.primary },
  title: { ...typography.h1, color: colors.text, marginBottom: spacing.sm },
  subtitle: { ...typography.body, color: colors.textSecondary, lineHeight: 24 },

  // Cards
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  activeCard: { borderColor: colors.primary, borderWidth: 2 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  cardTitle: { ...typography.h3, marginLeft: 12, color: colors.text },
  cardBody: { marginTop: spacing.md, paddingLeft: 34 },

  // Radio Button
  radioCircle: {
    height: 22,
    width: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedRb: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary,
  },

  // Inputs
  input: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: borderRadius.sm + 2,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
    color: colors.text,
  },
  label: { ...typography.label, color: '#374151', marginBottom: spacing.xs + 2 },
  helperText: { ...typography.caption, color: colors.textSecondary, textAlign: 'right', marginTop: -8 },

  // Camera Button
  cameraButton: {
    backgroundColor: colors.text,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: borderRadius.md,
    marginBottom: 20,
  },
  cameraButtonText: {
    color: colors.white,
    fontWeight: '600',
    marginLeft: spacing.sm,
    fontSize: 16,
  },

  // Divider
  divider: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  dividerText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textTertiary,
    letterSpacing: 1,
  },

  // Footer
  footer: {
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: 12,
    alignItems: 'center',
  },
  disabledButton: { backgroundColor: colors.primaryLight },
  primaryButtonText: { color: colors.white, fontSize: 18, fontWeight: '600' },

  row: { flexDirection: 'row' },

  // VIN decode
  decodeStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  decodeStatusText: {
    ...typography.caption,
    color: colors.textSecondary,
    marginLeft: spacing.sm,
    flex: 1,
  },
  vinResultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSecondary,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.md,
  },
  vinResultTitle: {
    ...typography.body,
    fontWeight: '600',
    color: colors.text,
  },
  vinResultSub: {
    ...typography.caption,
    color: colors.textSecondary,
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
  step3ToggleLabel: { ...typography.label, color: colors.text },
  step3ToggleHint: { ...typography.caption, color: colors.textTertiary, marginTop: 2 },
  step3SectionLabel: { ...typography.label, color: colors.text, marginBottom: spacing.sm, marginTop: spacing.sm },
  step3OptionDesc: { ...typography.caption, color: colors.textSecondary, marginTop: 4, marginLeft: 34 },
  recommendedBadge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  recommendedText: { fontSize: 11, fontWeight: '600', color: colors.white },
});

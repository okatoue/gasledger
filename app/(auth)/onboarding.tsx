import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing, borderRadius } from '@/theme/spacing';
import { vehicleService } from '@/services/vehicle/vehicleService';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/config/supabase';
import { decodeVin, VinResult } from '@/services/vehicle/vinDecoder';
import { useFuelEconomyLookup } from '@/hooks/useFuelEconomyLookup';
import { normalizeFuelInfo } from '@/services/vehicle/fuelEconomyApi';
import DropdownPicker from '@/components/common/Select';

type Tab = 'scan' | 'manual';

export default function OnboardingScreen() {
  const [activeTab, setActiveTab] = useState<Tab>('scan');
  const [vin, setVin] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDecoding, setIsDecoding] = useState(false);
  const [vinResult, setVinResult] = useState<VinResult | null>(null);
  const [vinError, setVinError] = useState('');
  const session = useAuthStore((s) => s.session);
  const setNeedsOnboarding = useAuthStore((s) => s.setNeedsOnboarding);

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
    console.log('[DEBUG handleSave] PRESSED');
    // Use store session, but fall back to a fresh Supabase session if store is stale
    const currentSession = session ?? (await supabase.auth.getSession()).data.session;
    if (!currentSession) {
      console.log('[DEBUG handleSave] NO SESSION — returning early');
      Alert.alert('Session Expired', 'Please sign in again.');
      return;
    }
    setIsSaving(true);
    try {
      if (activeTab === 'scan') {
        console.log('[DEBUG handleSave] scan path — decoding VIN');
        const decoded = vinResult ?? await decodeVin(vin);
        if (!decoded) {
          console.log('[DEBUG handleSave] VIN decode failed');
          Alert.alert('Error', 'Could not decode VIN. Try entering details manually.');
          return;
        }
        console.log('[DEBUG handleSave] creating vehicle (VIN)');
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
        console.log('[DEBUG handleSave] manual path — details:', JSON.stringify(details));
        const { fuelType, fuelGrade } = normalizeFuelInfo(details.fuelType1);
        console.log('[DEBUG handleSave] creating vehicle (manual):', { make: details.make, model: details.model, year: details.year, fuelType, fuelGrade });
        await vehicleService.create({
          user_id: currentSession.user.id,
          make: details.make,
          model: details.model,
          year: details.year,
          fuel_type: fuelType,
          default_fuel_grade: fuelGrade,
          efficiency_value: details.comb08,
          efficiency_unit: 'mpg',
          efficiency_source: 'fueleconomy.gov',
        });
      }
      console.log('[DEBUG handleSave] vehicle created — calling setNeedsOnboarding(false)');
      setNeedsOnboarding(false);
    } catch (error) {
      console.log('[DEBUG handleSave] ERROR:', error);
      Alert.alert('Error', 'Failed to save vehicle. Please try again.');
    } finally {
      console.log('[DEBUG handleSave] FINALLY — setting isSaving false');
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.progressBar}>
              <View style={[styles.progressStep, styles.activeStep]} />
              <View style={[styles.progressStep, styles.activeStep]} />
              <View style={styles.progressStep} />
            </View>
            <Text style={styles.title}>Let's set up your ride.</Text>
            <Text style={styles.subtitle}>
              We need your vehicle details to calculate your exact gas mileage.
            </Text>
          </View>

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
                        {normalizeFuelInfo(fuelLookup.vehicleDetails.fuelType1).fuelType}
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            )}
          </View>
        </ScrollView>

        {/* Sticky Footer */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.primaryButton, (!isFormValid || isSaving) && styles.disabledButton]}
            disabled={!isFormValid || isSaving}
            onPress={handleSave}
          >
            <Text style={styles.primaryButtonText}>{isSaving ? 'Saving...' : 'Save & Continue'}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { padding: spacing.lg, paddingBottom: 100 },

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
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
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
});

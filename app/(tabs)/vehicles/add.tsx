import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/theme/useColors';
import { typography } from '@/theme/typography';
import { spacing, borderRadius } from '@/theme/spacing';
import { vehicleService } from '@/services/vehicle/vehicleService';
import { useAuthStore } from '@/stores/authStore';
import { useVehicleStore } from '@/stores/vehicleStore';
import { useSubscription } from '@/hooks/useSubscription';
import { decodeVin, VinResult } from '@/services/vehicle/vinDecoder';
import { useFuelEconomyLookup } from '@/hooks/useFuelEconomyLookup';
import { normalizeFuelInfo } from '@/services/vehicle/fuelEconomyApi';
import DropdownPicker from '@/components/common/Select';

type Tab = 'scan' | 'manual';

export default function AddVehicleScreen() {
  const colors = useColors();
  const router = useRouter();
  const { isPro } = useSubscription();
  const vehicleCount = useVehicleStore((s) => s.vehicles.length);
  const [activeTab, setActiveTab] = useState<Tab>('scan');
  const [vin, setVin] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDecoding, setIsDecoding] = useState(false);
  const [vinResult, setVinResult] = useState<VinResult | null>(null);
  const [vinError, setVinError] = useState('');
  const session = useAuthStore((s) => s.session);

  const fuelLookup = useFuelEconomyLookup();

  const handleVinChange = (text: string) => {
    let cleaned = text.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
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
    ? vin.length === 17 && !isDecoding && vinResult !== null
    : fuelLookup.vehicleDetails !== null;

  const handleSave = async () => {
    if (!session) {
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
          user_id: session.user.id,
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
          user_id: session.user.id,
          make: details.make,
          model: details.model,
          year: details.year,
          fuel_type: fuelType,
          efficiency_value: details.comb08,
          efficiency_unit: 'mpg',
          efficiency_source: 'fueleconomy.gov',
        });
      }
      router.back();
    } catch (error) {
      console.error('[AddVehicle] Save failed:', error);
      Alert.alert('Error', 'Failed to save vehicle. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isPro && vehicleCount >= 1) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.scrollContent}>
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={{ alignItems: 'center', padding: spacing.lg }}>
              <Ionicons name="car-sport" size={48} color={colors.textTertiary} />
              <Text style={{ ...typography.h3, color: colors.text, marginTop: spacing.md, textAlign: 'center' }}>
                Vehicle Limit Reached
              </Text>
              <Text style={{ ...typography.body, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.sm }}>
                Free accounts are limited to 1 vehicle. Upgrade to Pro for unlimited vehicles.
              </Text>
              <TouchableOpacity
                style={[styles.primaryButton, { backgroundColor: colors.primary, marginTop: spacing.lg, flexDirection: 'row', gap: 8 }]}
                activeOpacity={0.8}
                onPress={() => router.push('/pro')}
              >
                <Ionicons name="diamond-outline" size={18} color={colors.white} />
                <Text style={[styles.primaryButtonText, { color: colors.white }]}>Upgrade to Pro</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Option 1: VIN */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, activeTab === 'scan' && { borderColor: colors.primary, borderWidth: 2 }]}>
          <TouchableOpacity style={styles.cardHeader} onPress={() => setActiveTab('scan')}>
            <View style={[styles.radioCircle, { borderColor: colors.primary }]}>
              {activeTab === 'scan' && <View style={[styles.selectedRb, { backgroundColor: colors.primary }]} />}
            </View>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Use VIN Number</Text>
          </TouchableOpacity>

          {activeTab === 'scan' && (
            <View style={styles.cardBody}>
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
              <Text style={[styles.helperText, { color: colors.textSecondary }]}>{vin.length}/17 characters</Text>

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
                    <Text style={[styles.vinResultSub, { color: colors.textSecondary }]}>Fuel: {vinResult.fuelType}</Text>
                  </View>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Option 2: Manual */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, activeTab === 'manual' && { borderColor: colors.primary, borderWidth: 2 }]}>
          <TouchableOpacity style={styles.cardHeader} onPress={() => setActiveTab('manual')}>
            <View style={[styles.radioCircle, { borderColor: colors.primary }]}>
              {activeTab === 'manual' && <View style={[styles.selectedRb, { backgroundColor: colors.primary }]} />}
            </View>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Enter Make & Model</Text>
          </TouchableOpacity>

          {activeTab === 'manual' && (
            <View style={styles.cardBody}>
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
      </ScrollView>

      {/* Footer */}
      <View style={[styles.footer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.primaryButton, { backgroundColor: colors.primary }, (!isFormValid || isSaving) && { backgroundColor: colors.primaryLight }]}
          disabled={!isFormValid || isSaving}
          onPress={handleSave}
        >
          <Text style={[styles.primaryButtonText, { color: colors.white }]}>{isSaving ? 'Saving...' : 'Save Vehicle'}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: spacing.lg, paddingBottom: 100 },

  card: {
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  cardTitle: { ...typography.h3, marginLeft: 12 },
  cardBody: { marginTop: spacing.md, paddingLeft: 34 },

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

  label: { ...typography.label, marginBottom: spacing.xs + 2 },
  input: {
    borderRadius: borderRadius.sm + 2,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  helperText: { ...typography.caption, textAlign: 'right', marginTop: -8 },

  decodeStatus: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.sm },
  decodeStatusText: { ...typography.caption, marginLeft: spacing.sm, flex: 1 },
  vinResultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.md,
  },
  vinResultTitle: { ...typography.body, fontWeight: '600' },
  vinResultSub: { ...typography.caption, marginTop: 2 },

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
});

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
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing, borderRadius } from '@/theme/spacing';
import { vehicleService } from '@/services/vehicle/vehicleService';
import { useAuthStore } from '@/stores/authStore';
import { decodeVin, VinResult } from '@/services/vehicle/vinDecoder';
import { useFuelEconomyLookup } from '@/hooks/useFuelEconomyLookup';
import { normalizeFuelInfo } from '@/services/vehicle/fuelEconomyApi';
import DropdownPicker from '@/components/common/Select';

type Tab = 'scan' | 'manual';

export default function AddVehicleScreen() {
  const router = useRouter();
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

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Option 1: VIN */}
        <View style={[styles.card, activeTab === 'scan' && styles.activeCard]}>
          <TouchableOpacity style={styles.cardHeader} onPress={() => setActiveTab('scan')}>
            <View style={styles.radioCircle}>
              {activeTab === 'scan' && <View style={styles.selectedRb} />}
            </View>
            <Text style={styles.cardTitle}>Use VIN Number</Text>
          </TouchableOpacity>

          {activeTab === 'scan' && (
            <View style={styles.cardBody}>
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
              <Text style={styles.helperText}>{vin.length}/17 characters</Text>

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
                    <Text style={styles.vinResultSub}>Fuel: {vinResult.fuelType}</Text>
                  </View>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Option 2: Manual */}
        <View style={[styles.card, activeTab === 'manual' && styles.activeCard]}>
          <TouchableOpacity style={styles.cardHeader} onPress={() => setActiveTab('manual')}>
            <View style={styles.radioCircle}>
              {activeTab === 'manual' && <View style={styles.selectedRb} />}
            </View>
            <Text style={styles.cardTitle}>Enter Make & Model</Text>
          </TouchableOpacity>

          {activeTab === 'manual' && (
            <View style={styles.cardBody}>
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
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.primaryButton, (!isFormValid || isSaving) && styles.disabledButton]}
          disabled={!isFormValid || isSaving}
          onPress={handleSave}
        >
          <Text style={styles.primaryButtonText}>{isSaving ? 'Saving...' : 'Save Vehicle'}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { padding: spacing.lg, paddingBottom: 100 },

  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  activeCard: { borderColor: colors.primary, borderWidth: 2 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  cardTitle: { ...typography.h3, marginLeft: 12, color: colors.text },
  cardBody: { marginTop: spacing.md, paddingLeft: 34 },

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

  label: { ...typography.label, color: '#374151', marginBottom: spacing.xs + 2 },
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
  helperText: { ...typography.caption, color: colors.textSecondary, textAlign: 'right', marginTop: -8 },

  decodeStatus: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.sm },
  decodeStatusText: { ...typography.caption, color: colors.textSecondary, marginLeft: spacing.sm, flex: 1 },
  vinResultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSecondary,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.md,
  },
  vinResultTitle: { ...typography.body, fontWeight: '600', color: colors.text },
  vinResultSub: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },

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
});

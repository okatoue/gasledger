import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { vehicleService, Vehicle } from '@/services/vehicle/vehicleService';
import DropdownPicker from '@/components/common/Select';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing, borderRadius } from '@/theme/spacing';

const FUEL_GRADES = [
  { text: 'Regular', value: 'regular' },
  { text: 'Midgrade', value: 'midgrade' },
  { text: 'Premium', value: 'premium' },
  { text: 'Diesel', value: 'diesel' },
];

const EFFICIENCY_UNITS = [
  { text: 'MPG', value: 'mpg' },
  { text: 'L/100km', value: 'l/100km' },
  { text: 'km/L', value: 'km/l' },
];

export default function EditVehicleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [editEfficiency, setEditEfficiency] = useState('');
  const [editEfficiencyUnit, setEditEfficiencyUnit] = useState('mpg');
  const [editFuelGrade, setEditFuelGrade] = useState('regular');

  useEffect(() => {
    if (!id) return;
    vehicleService
      .getById(id)
      .then((v) => {
        if (v) {
          setVehicle(v);
          setEditEfficiency(v.efficiency_value.toString());
          setEditEfficiencyUnit(v.efficiency_unit);
          setEditFuelGrade(v.default_fuel_grade);
        }
      })
      .catch((error) => console.error('[EditVehicle] Load failed:', error))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSave = async () => {
    if (!vehicle) return;
    setSaving(true);
    try {
      const effValue = parseFloat(editEfficiency) || 0;
      await vehicleService.update(vehicle.id, {
        efficiency_value: effValue,
        efficiency_unit: editEfficiencyUnit,
        default_fuel_grade: editFuelGrade,
      });
      router.back();
    } catch (error) {
      console.error('[EditVehicle] Save failed:', error);
      Alert.alert('Error', 'Failed to save changes.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Vehicle',
      'This will permanently delete this vehicle. Sessions using this vehicle will not be affected.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await vehicleService.delete(vehicle!.id);
              router.back();
            } catch (error) {
              console.error('[EditVehicle] Delete failed:', error);
              Alert.alert('Error', 'Failed to delete vehicle.');
            }
          },
        },
      ],
    );
  };

  if (loading || !vehicle) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Vehicle info (read-only) */}
      <View style={styles.infoCard}>
        <View style={styles.infoHeader}>
          <Ionicons name="car-sport" size={28} color={colors.primary} />
          <Text style={styles.infoTitle}>
            {vehicle.year} {vehicle.make} {vehicle.model}
          </Text>
        </View>
        {vehicle.vin && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>VIN</Text>
            <Text style={styles.infoValue}>{vehicle.vin}</Text>
          </View>
        )}
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Fuel Type</Text>
          <Text style={styles.infoValue}>{vehicle.fuel_type}</Text>
        </View>
      </View>

      {/* Editable fields */}
      <View style={styles.editCard}>
        <Text style={styles.sectionTitle}>Edit Details</Text>

        <Text style={styles.fieldLabel}>Fuel Efficiency</Text>
        <TextInput
          style={styles.input}
          value={editEfficiency}
          onChangeText={setEditEfficiency}
          keyboardType="decimal-pad"
          placeholder="0"
          placeholderTextColor={colors.textTertiary}
        />

        <DropdownPicker
          label="Efficiency Unit"
          placeholder="Select unit..."
          items={EFFICIENCY_UNITS}
          selectedValue={editEfficiencyUnit}
          onSelect={(item) => setEditEfficiencyUnit(item.value)}
        />

        <DropdownPicker
          label="Default Fuel Grade"
          placeholder="Select grade..."
          items={FUEL_GRADES}
          selectedValue={editFuelGrade}
          onSelect={(item) => setEditFuelGrade(item.value)}
        />
      </View>

      {/* Action buttons */}
      <TouchableOpacity
        style={[styles.saveButton, saving && styles.disabledButton]}
        onPress={handleSave}
        disabled={saving}
      >
        <Text style={styles.saveButtonText}>{saving ? 'Saving...' : 'Save Changes'}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
        <Ionicons name="trash" size={18} color={colors.white} />
        <Text style={styles.deleteButtonText}>Delete Vehicle</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: 40 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },

  infoCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  infoTitle: { ...typography.h2, color: colors.text, marginLeft: 10, flex: 1 },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  infoLabel: { ...typography.body, color: colors.textSecondary },
  infoValue: { ...typography.body, color: colors.text, fontWeight: '600' },

  editCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: { ...typography.h3, color: colors.text, marginBottom: spacing.md },
  fieldLabel: { ...typography.label, color: '#374151', marginBottom: spacing.xs + 2 },
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

  saveButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  saveButtonText: { ...typography.button, color: colors.white },
  disabledButton: { opacity: 0.6 },

  deleteButton: {
    backgroundColor: colors.error,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  deleteButtonText: { ...typography.button, color: colors.white },
});

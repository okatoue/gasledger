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
import { useColors } from '@/theme/useColors';
import { typography } from '@/theme/typography';
import { spacing, borderRadius } from '@/theme/spacing';

import { FUEL_TYPES } from '@/utils/fuelTypes';

const EFFICIENCY_UNITS = [
  { text: 'MPG', value: 'mpg' },
  { text: 'L/100km', value: 'l/100km' },
  { text: 'km/L', value: 'km/l' },
];

export default function EditVehicleScreen() {
  const colors = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [editEfficiency, setEditEfficiency] = useState('');
  const [editEfficiencyUnit, setEditEfficiencyUnit] = useState('mpg');
  const [editFuelType, setEditFuelType] = useState('regular');

  useEffect(() => {
    if (!id) return;
    vehicleService
      .getById(id)
      .then((v) => {
        if (v) {
          setVehicle(v);
          setEditEfficiency(v.efficiency_value.toString());
          setEditEfficiencyUnit(v.efficiency_unit);
          setEditFuelType(v.fuel_type);
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
        fuel_type: editFuelType,
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
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      {/* Vehicle info (read-only) */}
      <View style={[styles.infoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.infoHeader}>
          <Ionicons name="car-sport" size={28} color={colors.primary} />
          <Text style={[styles.infoTitle, { color: colors.text }]}>
            {vehicle.year} {vehicle.make} {vehicle.model}
          </Text>
        </View>
        {vehicle.vin && (
          <View style={[styles.infoRow, { borderTopColor: colors.border }]}>
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>VIN</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>{vehicle.vin}</Text>
          </View>
        )}
        <View style={[styles.infoRow, { borderTopColor: colors.border }]}>
          <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Fuel Type</Text>
          <Text style={[styles.infoValue, { color: colors.text }]}>{vehicle.fuel_type}</Text>
        </View>
      </View>

      {/* Editable fields */}
      <View style={[styles.editCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Edit Details</Text>

        <Text style={[styles.fieldLabel, { color: colors.text }]}>Fuel Efficiency</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, color: colors.text }]}
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
          label="Fuel Type"
          placeholder="Select type..."
          items={FUEL_TYPES}
          selectedValue={editFuelType}
          onSelect={(item) => setEditFuelType(item.value)}
        />
      </View>

      {/* Action buttons */}
      <TouchableOpacity
        style={[styles.saveButton, { backgroundColor: colors.primary }, saving && styles.disabledButton]}
        onPress={handleSave}
        disabled={saving}
      >
        <Text style={[styles.saveButtonText, { color: colors.white }]}>{saving ? 'Saving...' : 'Save Changes'}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.deleteButton, { backgroundColor: colors.error }]} onPress={handleDelete}>
        <Ionicons name="trash" size={18} color={colors.white} />
        <Text style={[styles.deleteButtonText, { color: colors.white }]}>Delete Vehicle</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: 40 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  infoCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  infoTitle: { ...typography.h2, marginLeft: 10, flex: 1 },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
  },
  infoLabel: { ...typography.body },
  infoValue: { ...typography.body, fontWeight: '600' },

  editCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
  },
  sectionTitle: { ...typography.h3, marginBottom: spacing.md },
  fieldLabel: { ...typography.label, marginBottom: spacing.xs + 2 },
  input: {
    borderRadius: borderRadius.sm + 2,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    marginBottom: 12,
  },

  saveButton: {
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  saveButtonText: { ...typography.button },
  disabledButton: { opacity: 0.6 },

  deleteButton: {
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  deleteButtonText: { ...typography.button },
});

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSettingsStore } from '@/stores/settingsStore';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing, borderRadius } from '@/theme/spacing';

function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { label: string; value: T }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <View style={styles.segmentWrapper}>
      <Text style={styles.segmentLabel}>{label}</Text>
      <View style={styles.segmentRow}>
        {options.map((opt) => (
          <TouchableOpacity
            key={opt.value}
            style={[styles.segmentButton, value === opt.value && styles.segmentButtonActive]}
            onPress={() => onChange(opt.value)}
          >
            <Text
              style={[styles.segmentButtonText, value === opt.value && styles.segmentButtonTextActive]}
            >
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

export default function UnitsScreen() {
  const distanceUnit = useSettingsStore((s) => s.distanceUnit);
  const volumeUnit = useSettingsStore((s) => s.volumeUnit);
  const currency = useSettingsStore((s) => s.currency);
  const setDistanceUnit = useSettingsStore((s) => s.setDistanceUnit);
  const setVolumeUnit = useSettingsStore((s) => s.setVolumeUnit);
  const setCurrency = useSettingsStore((s) => s.setCurrency);

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <SegmentedControl
          label="Distance"
          options={[
            { label: 'Miles', value: 'mi' as const },
            { label: 'Kilometers', value: 'km' as const },
          ]}
          value={distanceUnit}
          onChange={setDistanceUnit}
        />

        <SegmentedControl
          label="Volume"
          options={[
            { label: 'Gallons', value: 'gal' as const },
            { label: 'Liters', value: 'l' as const },
          ]}
          value={volumeUnit}
          onChange={setVolumeUnit}
        />

        <SegmentedControl
          label="Currency"
          options={[
            { label: 'USD ($)', value: 'usd' as const },
            { label: 'CAD ($)', value: 'cad' as const },
          ]}
          value={currency as 'usd' | 'cad'}
          onChange={setCurrency}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.lg },

  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },

  segmentWrapper: { marginBottom: spacing.lg },
  segmentLabel: { ...typography.label, color: colors.text, marginBottom: spacing.sm },
  segmentRow: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceSecondary,
    borderRadius: borderRadius.md,
    padding: 3,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: spacing.sm + 2,
    alignItems: 'center',
    borderRadius: borderRadius.md - 2,
  },
  segmentButtonActive: {
    backgroundColor: colors.primary,
  },
  segmentButtonText: { ...typography.button, color: colors.textSecondary },
  segmentButtonTextActive: { color: colors.white },
});

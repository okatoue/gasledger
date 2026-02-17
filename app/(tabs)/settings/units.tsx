import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useSettingsStore } from '@/stores/settingsStore';
import { useColors } from '@/theme/useColors';
import { spacing, borderRadius } from '@/theme/spacing';
import { SegmentedControl } from '@/components/common/SegmentedControl';

export default function UnitsScreen() {
  const colors = useColors();
  const distanceUnit = useSettingsStore((s) => s.distanceUnit);
  const volumeUnit = useSettingsStore((s) => s.volumeUnit);
  const currency = useSettingsStore((s) => s.currency);
  const setDistanceUnit = useSettingsStore((s) => s.setDistanceUnit);
  const setVolumeUnit = useSettingsStore((s) => s.setVolumeUnit);
  const setCurrency = useSettingsStore((s) => s.setCurrency);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
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
  container: { flex: 1, padding: spacing.lg },

  card: {
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
  },
});

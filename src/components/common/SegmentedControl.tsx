import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useColors } from '@/theme/useColors';
import { typography } from '@/theme/typography';
import { spacing, borderRadius } from '@/theme/spacing';

export function SegmentedControl<T extends string>({
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
  const colors = useColors();
  return (
    <View style={styles.segmentWrapper}>
      <Text style={[styles.segmentLabel, { color: colors.text }]}>{label}</Text>
      <View style={[styles.segmentRow, { backgroundColor: colors.surfaceSecondary }]}>
        {options.map((opt) => (
          <TouchableOpacity
            key={opt.value}
            style={[
              styles.segmentButton,
              value === opt.value && { backgroundColor: colors.primary },
            ]}
            onPress={() => onChange(opt.value)}
          >
            <Text
              style={[
                styles.segmentButtonText,
                { color: colors.textSecondary },
                value === opt.value && { color: colors.white },
              ]}
            >
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  segmentWrapper: { marginBottom: spacing.lg },
  segmentLabel: { ...typography.label, marginBottom: spacing.sm },
  segmentRow: {
    flexDirection: 'row',
    borderRadius: borderRadius.md,
    padding: 3,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: spacing.sm + 2,
    alignItems: 'center',
    borderRadius: borderRadius.md - 2,
  },
  segmentButtonText: { ...typography.button },
});

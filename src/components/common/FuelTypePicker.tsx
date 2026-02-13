import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { FUEL_TYPES } from '@/utils/fuelTypes';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing, borderRadius } from '@/theme/spacing';

interface FuelTypePickerProps {
  selected: string;
  onSelect: (type: string) => void;
}

function FuelTypePicker({ selected, onSelect }: FuelTypePickerProps) {
  return (
    <View style={styles.row}>
      {FUEL_TYPES.map((g) => {
        const active = g.value === selected;
        return (
          <TouchableOpacity
            key={g.value}
            style={[styles.pill, active && styles.pillActive]}
            onPress={() => onSelect(g.value)}
          >
            <Text style={[styles.pillText, active && styles.pillTextActive]}>
              {g.text}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default React.memo(FuelTypePicker);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceSecondary,
    borderRadius: borderRadius.md,
    padding: 3,
  },
  pill: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: borderRadius.md - 2,
  },
  pillActive: {
    backgroundColor: colors.primary,
  },
  pillText: { ...typography.button, color: colors.textSecondary, fontSize: 13 },
  pillTextActive: { color: colors.white },
});

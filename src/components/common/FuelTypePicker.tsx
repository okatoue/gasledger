import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { FUEL_TYPES } from '@/utils/fuelTypes';
import { useColors } from '@/theme/useColors';
import { typography } from '@/theme/typography';
import { spacing, borderRadius } from '@/theme/spacing';

interface FuelTypePickerProps {
  selected: string;
  onSelect: (type: string) => void;
}

const PILL_COUNT = FUEL_TYPES.length;
const PADDING = 3;

function FuelTypePicker({ selected, onSelect }: FuelTypePickerProps) {
  const colors = useColors();
  const slideAnim = useRef(new Animated.Value(0)).current;
  const rowWidth = useRef(0);

  const selectedIndex = FUEL_TYPES.findIndex((g) => g.value === selected);

  useEffect(() => {
    if (rowWidth.current > 0) {
      const pillWidth = (rowWidth.current - PADDING * 2) / PILL_COUNT;
      Animated.spring(slideAnim, {
        toValue: selectedIndex * pillWidth,
        useNativeDriver: true,
        speed: 20,
        bounciness: 0,
      }).start();
    }
  }, [selectedIndex]);

  const handleLayout = (e: any) => {
    const width = e.nativeEvent.layout.width;
    rowWidth.current = width;
    const pillWidth = (width - PADDING * 2) / PILL_COUNT;
    slideAnim.setValue(selectedIndex * pillWidth);
  };

  return (
    <View style={[styles.row, { backgroundColor: colors.surfaceSecondary }]} onLayout={handleLayout}>
      <Animated.View
        style={[
          styles.indicator,
          {
            backgroundColor: colors.primary,
            width: `${100 / PILL_COUNT}%` as any,
            transform: [{ translateX: slideAnim }],
          },
        ]}
      />
      {FUEL_TYPES.map((g) => {
        const active = g.value === selected;
        return (
          <TouchableOpacity
            key={g.value}
            style={styles.pill}
            onPress={() => onSelect(g.value)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.pillText,
                { color: colors.textSecondary },
                active && { color: colors.white },
              ]}
            >
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
    borderRadius: borderRadius.md,
    padding: PADDING,
  },
  indicator: {
    position: 'absolute',
    top: PADDING,
    bottom: PADDING,
    left: PADDING,
    borderRadius: borderRadius.md - 2,
  },
  pill: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: borderRadius.md - 2,
  },
  pillText: { ...typography.button, fontSize: 13 },
});

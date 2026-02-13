import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, Text, TextStyle } from 'react-native';

const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

interface RollingDigitProps {
  digit: number;
  height: number;
  textStyle: TextStyle;
  duration: number;
}

function RollingDigit({ digit, height, textStyle, duration }: RollingDigitProps) {
  const translateY = useRef(new Animated.Value(-digit * height)).current;

  useEffect(() => {
    Animated.timing(translateY, {
      toValue: -digit * height,
      duration,
      useNativeDriver: true,
    }).start();
  }, [digit, height, duration]);

  return (
    <View style={[styles.digitWrap, { height }]}>
      <Animated.View style={{ transform: [{ translateY }] }}>
        {DIGITS.map((d) => (
          <View key={d} style={[styles.digitCell, { height }]}>
            <Text style={textStyle}>{d}</Text>
          </View>
        ))}
      </Animated.View>
    </View>
  );
}

interface RollingPriceProps {
  value: string;          // e.g. "3.459"
  textStyle: TextStyle;
  height?: number;        // line-height of a single digit
  duration?: number;      // ms per roll
}

export default function RollingPrice({
  value,
  textStyle,
  height = 24,
  duration = 250,
}: RollingPriceProps) {
  return (
    <View style={styles.row}>
      {value.split('').map((char, i) => {
        if (char === '.') {
          return (
            <View key={`dot-${i}`} style={[styles.digitCell, { height }]}>
              <Text style={textStyle}>.</Text>
            </View>
          );
        }
        const num = parseInt(char, 10);
        if (isNaN(num)) return null;
        return (
          <RollingDigit
            key={`d-${i}`}
            digit={num}
            height={height}
            textStyle={textStyle}
            duration={duration}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  digitWrap: {
    overflow: 'hidden',
  },
  digitCell: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

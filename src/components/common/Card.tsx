import { View, StyleSheet, ViewStyle } from 'react-native';
import { useColors } from '@/theme/useColors';
import { spacing, borderRadius } from '@/theme/spacing';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export default function Card({ children, style }: CardProps) {
  const colors = useColors();
  return (
    <View style={[styles.card, { backgroundColor: colors.surface, shadowColor: colors.black }, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
});

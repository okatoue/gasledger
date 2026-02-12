import { Pressable, Text, StyleSheet } from 'react-native';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing, borderRadius } from '@/theme/spacing';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
  disabled?: boolean;
}

export default function Button({ title, onPress, variant = 'primary', disabled }: ButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[styles.base, variant === 'outline' && styles.outline, disabled && styles.disabled]}
    >
      <Text style={[styles.text, variant === 'outline' && styles.outlineText]}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm + 4,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    ...typography.button,
    color: colors.white,
  },
  outlineText: {
    color: colors.primary,
  },
});

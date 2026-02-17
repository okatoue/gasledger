import { Pressable, Text, StyleSheet } from 'react-native';
import { useColors } from '@/theme/useColors';
import { typography } from '@/theme/typography';
import { spacing, borderRadius } from '@/theme/spacing';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
  disabled?: boolean;
}

export default function Button({ title, onPress, variant = 'primary', disabled }: ButtonProps) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.base,
        { backgroundColor: colors.primary },
        variant === 'outline' && [styles.outline, { borderColor: colors.primary, backgroundColor: 'transparent' }],
        disabled && styles.disabled,
      ]}
    >
      <Text
        style={[
          styles.text,
          { color: colors.white },
          variant === 'outline' && { color: colors.primary },
        ]}
      >
        {title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: spacing.sm + 4,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  outline: {
    borderWidth: 1,
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    ...typography.button,
  },
});

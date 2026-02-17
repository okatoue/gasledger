import { useState } from 'react';
import { TextInput as RNTextInput, View, Text, Pressable, StyleSheet, TextInputProps as RNTextInputProps } from 'react-native';
import { useColors } from '@/theme/useColors';
import { typography } from '@/theme/typography';
import { spacing, borderRadius } from '@/theme/spacing';

interface TextInputProps extends RNTextInputProps {
  label?: string;
  error?: string;
}

export default function TextInput({ label, error, style, secureTextEntry, ...props }: TextInputProps) {
  const colors = useColors();
  const [hidden, setHidden] = useState(true);

  return (
    <View style={styles.container}>
      {label && <Text style={[styles.label, { color: colors.text }]}>{label}</Text>}
      <View
        style={[
          styles.inputWrapper,
          { borderColor: colors.border, backgroundColor: colors.surface },
          error && { borderColor: colors.error },
        ]}
      >
        <RNTextInput
          style={[styles.input, { color: colors.text }, secureTextEntry && styles.inputWithToggle, style]}
          placeholderTextColor={colors.textTertiary}
          secureTextEntry={secureTextEntry && hidden}
          {...props}
        />
        {secureTextEntry && (
          <Pressable onPress={() => setHidden(!hidden)} style={styles.toggle} hitSlop={8}>
            <Text style={[styles.toggleText, { color: colors.primary }]}>{hidden ? 'Show' : 'Hide'}</Text>
          </Pressable>
        )}
      </View>
      {error && <Text style={[styles.error, { color: colors.error }]}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: spacing.md },
  label: { ...typography.label, marginBottom: spacing.xs },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: borderRadius.md,
  },
  input: {
    ...typography.body,
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
  },
  inputWithToggle: {
    paddingRight: spacing.xs,
  },
  toggle: {
    paddingHorizontal: spacing.md,
  },
  toggleText: {
    ...typography.bodySmall,
    fontWeight: '600',
  },
  error: { ...typography.caption, marginTop: spacing.xs },
});

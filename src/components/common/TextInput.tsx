import { useState } from 'react';
import { TextInput as RNTextInput, View, Text, Pressable, StyleSheet, TextInputProps as RNTextInputProps } from 'react-native';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing, borderRadius } from '@/theme/spacing';

interface TextInputProps extends RNTextInputProps {
  label?: string;
  error?: string;
}

export default function TextInput({ label, error, style, secureTextEntry, ...props }: TextInputProps) {
  const [hidden, setHidden] = useState(true);

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={[styles.inputWrapper, error && styles.inputError]}>
        <RNTextInput
          style={[styles.input, secureTextEntry && styles.inputWithToggle, style]}
          placeholderTextColor={colors.textTertiary}
          secureTextEntry={secureTextEntry && hidden}
          {...props}
        />
        {secureTextEntry && (
          <Pressable onPress={() => setHidden(!hidden)} style={styles.toggle} hitSlop={8}>
            <Text style={styles.toggleText}>{hidden ? 'Show' : 'Hide'}</Text>
          </Pressable>
        )}
      </View>
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: spacing.md },
  label: { ...typography.label, color: colors.text, marginBottom: spacing.xs },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
  },
  input: {
    ...typography.body,
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    color: colors.text,
  },
  inputWithToggle: {
    paddingRight: spacing.xs,
  },
  inputError: { borderColor: colors.error },
  toggle: {
    paddingHorizontal: spacing.md,
  },
  toggleText: {
    ...typography.bodySmall,
    color: colors.primary,
    fontWeight: '600',
  },
  error: { ...typography.caption, color: colors.error, marginTop: spacing.xs },
});

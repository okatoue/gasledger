import { View, Text, StyleSheet } from 'react-native';
import { useColors } from '@/theme/useColors';
import { typography } from '@/theme/typography';
import { spacing } from '@/theme/spacing';

export default function AuthDivider() {
  const colors = useColors();
  return (
    <View style={styles.container}>
      <View style={[styles.line, { backgroundColor: colors.border }]} />
      <Text style={[styles.text, { color: colors.textTertiary }]}>or continue with</Text>
      <View style={[styles.line, { backgroundColor: colors.border }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.lg,
  },
  line: {
    flex: 1,
    height: 1,
  },
  text: {
    ...typography.bodySmall,
    marginHorizontal: spacing.md,
  },
});

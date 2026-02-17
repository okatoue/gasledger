import { View, Text, StyleSheet } from 'react-native';
import { useColors } from '@/theme/useColors';
import { typography } from '@/theme/typography';
import { spacing } from '@/theme/spacing';

interface EmptyStateProps {
  title: string;
  message?: string;
}

export default function EmptyState({ title, message }: EmptyStateProps) {
  const colors = useColors();
  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      {message && <Text style={[styles.message, { color: colors.textSecondary }]}>{message}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
  title: { ...typography.h3, textAlign: 'center' },
  message: { ...typography.body, textAlign: 'center', marginTop: spacing.sm },
});

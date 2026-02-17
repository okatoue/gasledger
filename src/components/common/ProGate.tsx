import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSubscription } from '@/hooks/useSubscription';
import { useColors } from '@/theme/useColors';
import { typography } from '@/theme/typography';
import { spacing, borderRadius } from '@/theme/spacing';

interface ProGateProps {
  children: React.ReactNode;
  featureName: string;
  fallback?: React.ReactNode;
}

export default function ProGate({ children, featureName, fallback }: ProGateProps) {
  const { isPro, isLoaded } = useSubscription();
  const router = useRouter();
  const colors = useColors();

  if (!isLoaded) return null;
  if (isPro) return <>{children}</>;

  if (fallback) return <>{fallback}</>;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.card, { backgroundColor: colors.surface, shadowColor: colors.black }]}>
        <Ionicons name="star" size={36} color={colors.warning} />
        <Text style={[styles.title, { color: colors.text }]}>{featureName} is a Pro feature</Text>
        <Text style={[styles.description, { color: colors.textSecondary }]}>
          Upgrade to GasLedger Pro to unlock this feature and more.
        </Text>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.primary }]}
          activeOpacity={0.8}
          onPress={() => router.push('/pro')}
        >
          <Ionicons name="diamond-outline" size={18} color={colors.white} />
          <Text style={[styles.buttonText, { color: colors.white }]}>Upgrade to Pro</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  card: {
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    width: '100%',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  title: {
    ...typography.h3,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  description: {
    ...typography.body,
    textAlign: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.md,
  },
  buttonText: {
    ...typography.button,
  },
});

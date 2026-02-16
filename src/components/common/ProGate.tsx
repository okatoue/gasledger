import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSubscription } from '@/hooks/useSubscription';
import { colors } from '@/theme/colors';
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

  if (!isLoaded) return null;
  if (isPro) return <>{children}</>;

  if (fallback) return <>{fallback}</>;

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Ionicons name="star" size={36} color={colors.warning} />
        <Text style={styles.title}>{featureName} is a Pro feature</Text>
        <Text style={styles.description}>
          Upgrade to GasLedger Pro to unlock this feature and more.
        </Text>
        <TouchableOpacity
          style={styles.button}
          activeOpacity={0.8}
          onPress={() => router.push('/pro')}
        >
          <Ionicons name="diamond-outline" size={18} color={colors.white} />
          <Text style={styles.buttonText}>Upgrade to Pro</Text>
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
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    width: '100%',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  title: {
    ...typography.h3,
    color: colors.text,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  description: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.md,
  },
  buttonText: {
    ...typography.button,
    color: colors.white,
  },
});

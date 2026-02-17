import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Purchases, { PurchasesPackage } from 'react-native-purchases';
import { useSubscriptionStore } from '@/stores/subscriptionStore';
import { useSubscription } from '@/hooks/useSubscription';
import { useColors } from '@/theme/useColors';
import { typography } from '@/theme/typography';
import { spacing, borderRadius } from '@/theme/spacing';

const BENEFITS = [
  { icon: 'car-sport-outline' as const, label: 'Unlimited Vehicles' },
  { icon: 'download-outline' as const, label: 'CSV Export' },
  { icon: 'star-outline' as const, label: 'Home Station Auto-Pricing' },
  { icon: 'bar-chart-outline' as const, label: 'Spending Analytics' },
  { icon: 'ban-outline' as const, label: 'Remove Ads' },
  { icon: 'bluetooth-outline' as const, label: 'Auto Start When Your Car Starts' },
];

export default function ProScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isPro } = useSubscription();
  const offerings = useSubscriptionStore((s) => s.offerings);
  const loadOfferings = useSubscriptionStore((s) => s.loadOfferings);
  const restorePurchases = useSubscriptionStore((s) => s.restorePurchases);

  const [selectedPkg, setSelectedPkg] = useState<PurchasesPackage | null>(null);
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    loadOfferings();
  }, []);

  const packages = offerings?.current?.availablePackages ?? [];

  // Auto-select first package
  useEffect(() => {
    if (packages.length > 0 && !selectedPkg) {
      setSelectedPkg(packages[0]);
    }
  }, [packages]);

  const setPurchased = useSubscriptionStore((s) => s.setPurchased);

  const handlePurchase = async () => {
    if (!selectedPkg) return;
    setPurchasing(true);
    try {
      const { customerInfo } = await Purchases.purchasePackage(selectedPkg);
      console.log('[Pro] Purchase complete, active entitlements:', Object.keys(customerInfo.entitlements.active));
      setPurchased(customerInfo);
      router.back();
    } catch (error: any) {
      if (!error.userCancelled) {
        Alert.alert('Purchase Error', error.message ?? 'Something went wrong. Please try again.');
      }
    } finally {
      setPurchasing(false);
    }
  };

  const handleRestore = async () => {
    setRestoring(true);
    const restored = await restorePurchases();
    setRestoring(false);
    if (restored) {
      Alert.alert('Restored', 'Your Pro subscription has been restored.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } else {
      Alert.alert('No Purchases Found', 'No previous Pro subscription was found for this account.');
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      {/* Close button */}
      <TouchableOpacity
        style={styles.closeButton}
        onPress={() => router.back()}
        hitSlop={12}
      >
        <Ionicons name="close" size={28} color={colors.text} />
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={[styles.diamondCircle, { backgroundColor: colors.primaryBg }]}>
            <Ionicons name="diamond" size={36} color={colors.primary} />
          </View>
          <Text style={[styles.headerTitle, { color: colors.text }]}>GasLedger Pro</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            {isPro ? 'You have an active Pro subscription' : 'Unlock all features'}
          </Text>
        </View>

        {/* Benefits */}
        <View style={[styles.benefitsList, { backgroundColor: colors.surface }]}>
          {BENEFITS.map((b) => (
            <View key={b.label} style={styles.benefitRow}>
              <View style={[styles.benefitIcon, { backgroundColor: colors.primaryBg }]}>
                <Ionicons name={b.icon} size={20} color={colors.primary} />
              </View>
              <Text style={[styles.benefitLabel, { color: colors.text }]}>{b.label}</Text>
              <Ionicons name="checkmark-circle" size={20} color={colors.success} />
            </View>
          ))}
        </View>

        {/* Subscription packages */}
        {!isPro && (
          <>
            {packages.length === 0 ? (
              <View style={styles.loadingPackages}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading plans...</Text>
              </View>
            ) : (
              <View style={styles.packagesContainer}>
                {packages.map((pkg) => {
                  const isSelected = selectedPkg?.identifier === pkg.identifier;
                  const isAnnual = pkg.packageType === 'ANNUAL';
                  return (
                    <TouchableOpacity
                      key={pkg.identifier}
                      style={[
                        styles.packageCard,
                        { backgroundColor: colors.surface, borderColor: colors.border },
                        isSelected && { borderColor: colors.primary, backgroundColor: colors.primaryBg },
                      ]}
                      activeOpacity={0.7}
                      onPress={() => setSelectedPkg(pkg)}
                    >
                      {isAnnual && (
                        <View style={[styles.saveBadge, { backgroundColor: colors.success }]}>
                          <Text style={styles.saveBadgeText}>SAVE</Text>
                        </View>
                      )}
                      <Text style={[styles.packageTitle, { color: colors.text }, isSelected && { color: colors.primary, fontWeight: '700' }]}>
                        {isAnnual ? 'Yearly' : 'Monthly'}
                      </Text>
                      <Text style={[styles.packagePrice, { color: colors.textSecondary }]}>
                        {pkg.product.priceString}/{isAnnual ? 'year' : 'month'}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {/* Purchase button */}
            <TouchableOpacity
              style={[styles.purchaseButton, { backgroundColor: colors.primary }, (purchasing || !selectedPkg) && styles.purchaseButtonDisabled]}
              onPress={handlePurchase}
              disabled={purchasing || !selectedPkg}
              activeOpacity={0.8}
            >
              {purchasing ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.purchaseButtonText}>Subscribe</Text>
              )}
            </TouchableOpacity>

            {/* Restore */}
            <TouchableOpacity
              style={styles.restoreButton}
              onPress={handleRestore}
              disabled={restoring}
            >
              <Text style={[styles.restoreText, { color: colors.primary }]}>
                {restoring ? 'Restoring...' : 'Restore Purchases'}
              </Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  closeButton: {
    position: 'absolute',
    top: 52,
    right: spacing.md,
    zIndex: 10,
    padding: spacing.xs,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: 60,
  },
  header: {
    alignItems: 'center',
    marginTop: spacing.xl,
    marginBottom: spacing.xl,
  },
  diamondCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  headerTitle: {
    ...typography.h1,
  },
  headerSubtitle: {
    ...typography.body,
    marginTop: spacing.xs,
  },
  benefitsList: {
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    gap: 2,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm + 2,
  },
  benefitIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm + 2,
  },
  benefitLabel: {
    ...typography.body,
    flex: 1,
  },
  loadingPackages: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.sm,
  },
  loadingText: {
    ...typography.caption,
  },
  packagesContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  packageCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.md,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.sm,
    borderWidth: 2,
  },
  packageTitle: {
    ...typography.label,
    fontSize: 16,
  },
  packagePrice: {
    ...typography.caption,
    marginTop: 4,
  },
  saveBadge: {
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  saveBadgeText: {
    ...typography.caption,
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 10,
  },
  purchaseButton: {
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  purchaseButtonDisabled: {
    opacity: 0.6,
  },
  purchaseButtonText: {
    ...typography.button,
    color: '#FFFFFF',
    fontSize: 18,
  },
  restoreButton: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  restoreText: {
    ...typography.bodySmall,
  },
});

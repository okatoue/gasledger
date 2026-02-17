import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/theme/useColors';
import { Colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing, borderRadius } from '@/theme/spacing';
import { deleteDatabase } from '@/db/database';
import { useAuthStore } from '@/stores/authStore';
import { useSubscription } from '@/hooks/useSubscription';
import { useSubscriptionStore } from '@/stores/subscriptionStore';
import { supabase } from '@/config/supabase';
import { vehicleService } from '@/services/vehicle/vehicleService';
import { useSettingsStore } from '@/stores/settingsStore';
import { useIsDark } from '@/theme/useColors';

function NavRow({ label, icon, onPress, colors }: { label: string; icon: string; onPress: () => void; colors: Colors }) {
  return (
    <TouchableOpacity style={[styles.navRow, { borderBottomColor: colors.border }]} onPress={onPress} activeOpacity={0.7}>
      <Ionicons name={icon as any} size={20} color={colors.primary} />
      <Text style={[styles.navRowText, { color: colors.text }]}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
    </TouchableOpacity>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const colors = useColors();
  const { isPro } = useSubscription();
  const [isClearing, setIsClearing] = useState(false);
  const isDark = useIsDark();
  const setColorScheme = useSettingsStore((s) => s.setColorScheme);

  const handleClearStorage = () => {
    Alert.alert(
      'Clear App Storage',
      'This will delete all local data (vehicles, sessions, routes) and sign you out. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            setIsClearing(true);
            try {
              const session = useAuthStore.getState().session;
              if (session) {
                await vehicleService.deleteAllByUser(session.user.id);
              }
              await deleteDatabase();
            } catch (error) {
              console.error('[Settings] Clear storage failed:', error);
            }
            useAuthStore.getState().setNeedsOnboarding(true);
            await supabase.auth.signOut();
          },
        },
      ],
    );
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.contentContainer}>
      {/* Pro section */}
      <View style={styles.section}>
        <View style={[styles.navCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <NavRow
            label={isPro ? 'GasLedger Pro (Active)' : 'Upgrade to Pro'}
            icon="diamond-outline"
            onPress={() => router.push('/pro')}
            colors={colors}
          />
        </View>
      </View>

      {/* Appearance section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Appearance</Text>
        <View style={[styles.navCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.themeRow}>
            <Ionicons name={isDark ? 'moon' : 'sunny'} size={20} color={colors.primary} />
            <Text style={[styles.navRowText, { color: colors.text }]}>Dark Mode</Text>
            <TouchableOpacity
              style={[styles.themeToggle, { backgroundColor: isDark ? colors.primary : colors.surfaceSecondary }]}
              onPress={() => setColorScheme(isDark ? 'light' : 'dark')}
              activeOpacity={0.7}
            >
              <View style={[styles.themeToggleKnob, isDark && styles.themeToggleKnobActive]} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Navigation section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Preferences</Text>
        <View style={[styles.navCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <NavRow
            label="Units & Currency"
            icon="options-outline"
            onPress={() => router.push('/settings/units')}
            colors={colors}
          />
          <NavRow
            label="Privacy & Deletion"
            icon="shield-outline"
            onPress={() => router.push('/settings/privacy')}
            colors={colors}
          />
          <NavRow
            label="Export Data"
            icon="download-outline"
            onPress={() => router.push('/settings/export')}
            colors={colors}
          />
        </View>
      </View>

      {/* Data section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Data</Text>
        <View style={styles.destructiveRow}>
          <TouchableOpacity
            style={[styles.destructiveButton, { flex: 1, backgroundColor: colors.error }]}
            onPress={handleClearStorage}
            disabled={isClearing}
          >
            <Text style={styles.destructiveButtonText}>
              {isClearing ? 'Clearing...' : 'Clear App Storage'}
            </Text>
          </TouchableOpacity>
          {isPro && (
            <TouchableOpacity
              style={[styles.destructiveButton, { flex: 1, backgroundColor: colors.warning }]}
              onPress={() => {
                Alert.alert(
                  'Remove Pro',
                  'This will remove Pro status locally (for testing). It does not cancel a real subscription.',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Remove',
                      style: 'destructive',
                      onPress: () => useSubscriptionStore.getState().removePro(),
                    },
                  ],
                );
              }}
            >
              <Text style={styles.destructiveButtonText}>Remove Pro</Text>
            </TouchableOpacity>
          )}
        </View>
        <Text style={[styles.hint, { color: colors.textSecondary }]}>
          Deletes all local data and signs you out.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  contentContainer: { padding: spacing.lg, paddingBottom: 40 },
  section: { marginTop: spacing.lg },
  sectionTitle: { ...typography.h3, marginBottom: spacing.md },

  navCard: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
  },
  navRowText: {
    ...typography.body,
    flex: 1,
    marginLeft: spacing.sm + 2,
  },
  themeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
  },
  themeToggle: {
    width: 48,
    height: 28,
    borderRadius: 14,
    padding: 3,
    justifyContent: 'center',
  },
  themeToggleKnob: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FFFFFF',
  },
  themeToggleKnobActive: {
    alignSelf: 'flex-end',
  },

  destructiveRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  destructiveButton: {
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  destructiveButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  hint: { ...typography.caption, marginTop: spacing.sm },
});

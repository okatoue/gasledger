import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSettingsStore } from '@/stores/settingsStore';
import { useAuthStore } from '@/stores/authStore';
import { sessionRepository } from '@/db/repositories/sessionRepository';
import { routePointRepository } from '@/db/repositories/routePointRepository';
import { deleteDatabase } from '@/db/database';
import { supabase } from '@/config/supabase';
import { vehicleService } from '@/services/vehicle/vehicleService';
import { syncService } from '@/services/sync/syncService';
import { syncQueue } from '@/services/sync/syncQueue';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing, borderRadius } from '@/theme/spacing';

export default function PrivacyScreen() {
  const routeStorageEnabled = useSettingsStore((s) => s.routeStorageEnabled);
  const setRouteStorageEnabled = useSettingsStore((s) => s.setRouteStorageEnabled);

  const handleDeleteAllSessions = () => {
    Alert.alert(
      'Delete All Sessions',
      'This will permanently delete all your driving sessions, including route data and tracking gaps. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: async () => {
            try {
              const session = useAuthStore.getState().session;
              if (session) {
                await sessionRepository.deleteAllByUser(session.user.id);
                syncService.deleteAllSessionsRemote(session.user.id).catch(console.error);
              }
              Alert.alert('Done', 'All sessions have been deleted.');
            } catch (error) {
              console.error('[Privacy] Delete sessions failed:', error);
              Alert.alert('Error', 'Failed to delete sessions.');
            }
          },
        },
      ],
    );
  };

  const handleDeleteRouteData = () => {
    Alert.alert(
      'Delete Route Data',
      'This will permanently delete all route point data from your sessions. The sessions themselves will be kept. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Routes',
          style: 'destructive',
          onPress: async () => {
            try {
              const session = useAuthStore.getState().session;
              if (session) {
                await routePointRepository.deleteAllByUser(session.user.id);
              }
              Alert.alert('Done', 'All route data has been deleted.');
            } catch (error) {
              console.error('[Privacy] Delete route data failed:', error);
              Alert.alert('Error', 'Failed to delete route data.');
            }
          },
        },
      ],
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure? This will delete all local data and sign you out.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Final Confirmation',
              'This action cannot be undone. To fully delete your cloud account, please contact support after signing out.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete & Sign Out',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      const session = useAuthStore.getState().session;
                      if (session) {
                        await vehicleService.deleteAllByUser(session.user.id);
                      }
                      await syncQueue.clear().catch(() => {});
                      await deleteDatabase();
                    } catch (error) {
                      console.error('[Privacy] Delete account failed:', error);
                    }
                    useAuthStore.getState().setNeedsOnboarding(true);
                    await supabase.auth.signOut();
                  },
                },
              ],
            );
          },
        },
      ],
    );
  };

  return (
    <View style={styles.container}>
      {/* Route Storage Toggle */}
      <View style={styles.card}>
        <View style={styles.toggleRow}>
          <View style={styles.toggleInfo}>
            <Ionicons name="navigate-outline" size={20} color={colors.primary} />
            <View style={styles.toggleTextWrapper}>
              <Text style={styles.toggleLabel}>Route Storage</Text>
              <Text style={styles.toggleHint}>
                When enabled, GPS route points are saved with each session
              </Text>
            </View>
          </View>
          <Switch
            value={routeStorageEnabled}
            onValueChange={setRouteStorageEnabled}
            trackColor={{ false: colors.border, true: colors.primaryLight }}
            thumbColor={routeStorageEnabled ? colors.primary : colors.textTertiary}
          />
        </View>
      </View>

      {/* Destructive Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Delete Data</Text>

        <TouchableOpacity style={styles.destructiveButton} onPress={handleDeleteAllSessions}>
          <Ionicons name="trash-outline" size={18} color={colors.white} />
          <Text style={styles.destructiveButtonText}>Delete All Sessions</Text>
        </TouchableOpacity>
        <Text style={styles.hint}>Removes all sessions, route data, and tracking gaps</Text>

        <TouchableOpacity style={[styles.destructiveButton, { marginTop: spacing.md }]} onPress={handleDeleteRouteData}>
          <Ionicons name="map-outline" size={18} color={colors.white} />
          <Text style={styles.destructiveButtonText}>Delete All Route Data</Text>
        </TouchableOpacity>
        <Text style={styles.hint}>Removes route points only; sessions are kept</Text>
      </View>

      {/* Account Deletion */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>

        <TouchableOpacity style={styles.dangerButton} onPress={handleDeleteAccount}>
          <Ionicons name="person-remove-outline" size={18} color={colors.white} />
          <Text style={styles.destructiveButtonText}>Delete Account</Text>
        </TouchableOpacity>
        <Text style={styles.hint}>
          Deletes local data and signs you out. Contact support to fully remove your cloud account.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.lg },

  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },

  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleInfo: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: spacing.md },
  toggleTextWrapper: { marginLeft: spacing.sm + 2, flex: 1 },
  toggleLabel: { ...typography.label, color: colors.text },
  toggleHint: { ...typography.caption, color: colors.textTertiary, marginTop: 2 },

  section: { marginTop: spacing.xl },
  sectionTitle: { ...typography.h3, color: colors.text, marginBottom: spacing.md },

  destructiveButton: {
    backgroundColor: colors.error,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  destructiveButtonText: { color: colors.white, fontSize: 16, fontWeight: '600' },
  hint: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.xs },

  dangerButton: {
    backgroundColor: '#991B1B',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
});

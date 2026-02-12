import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing, borderRadius } from '@/theme/spacing';
import { deleteDatabase } from '@/db/database';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/config/supabase';
import { vehicleService } from '@/services/vehicle/vehicleService';

function NavRow({ label, icon, onPress }: { label: string; icon: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.navRow} onPress={onPress} activeOpacity={0.7}>
      <Ionicons name={icon as any} size={20} color={colors.primary} />
      <Text style={styles.navRowText}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
    </TouchableOpacity>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const [isClearing, setIsClearing] = useState(false);

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
    <View style={styles.container}>
      {/* Navigation section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Preferences</Text>
        <View style={styles.navCard}>
          <NavRow
            label="Units & Currency"
            icon="options-outline"
            onPress={() => router.push('/settings/units')}
          />
          <NavRow
            label="Privacy & Deletion"
            icon="shield-outline"
            onPress={() => router.push('/settings/privacy')}
          />
          <NavRow
            label="Export Data"
            icon="download-outline"
            onPress={() => router.push('/settings/export')}
          />
        </View>
      </View>

      {/* Data section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Data</Text>
        <TouchableOpacity
          style={styles.destructiveButton}
          onPress={handleClearStorage}
          disabled={isClearing}
        >
          <Text style={styles.destructiveButtonText}>
            {isClearing ? 'Clearing...' : 'Clear App Storage'}
          </Text>
        </TouchableOpacity>
        <Text style={styles.hint}>
          Deletes all local data and signs you out.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.lg },
  section: { marginTop: spacing.lg },
  sectionTitle: { ...typography.h3, color: colors.text, marginBottom: spacing.md },

  navCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  navRowText: {
    ...typography.body,
    color: colors.text,
    flex: 1,
    marginLeft: spacing.sm + 2,
  },

  destructiveButton: {
    backgroundColor: colors.error,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  destructiveButtonText: { color: colors.white, fontSize: 16, fontWeight: '600' },
  hint: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.sm },
});

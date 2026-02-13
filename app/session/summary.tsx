import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { sessionRepository, Session } from '@/db/repositories/sessionRepository';
import { trackingGapRepository } from '@/db/repositories/trackingGapRepository';
import { syncService } from '@/services/sync/syncService';
import { useSettingsStore } from '@/stores/settingsStore';
import { metersToMiles, metersToKm } from '@/services/fuel/unitConverter';
import { formatDurationLabel } from '@/utils/formatting';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing, borderRadius } from '@/theme/spacing';

export default function SessionSummaryScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const distanceUnit = useSettingsStore((s) => s.distanceUnit);
  const volumeUnit = useSettingsStore((s) => s.volumeUnit);
  const [session, setSession] = useState<Session | null>(null);
  const [notes, setNotes] = useState('');
  const [gapCount, setGapCount] = useState(0);

  useEffect(() => {
    if (!sessionId) return;
    sessionRepository.getById(sessionId).then((s) => {
      if (s) {
        setSession(s);
        setNotes(s.notes ?? '');
      }
    });
    trackingGapRepository.getBySession(sessionId).then((gaps) => {
      setGapCount(gaps.length);
    });
  }, [sessionId]);

  const handleDone = async () => {
    if (sessionId && notes.trim()) {
      await sessionRepository.updateNotes(sessionId, notes.trim());
    }
    if (sessionId) {
      syncService.syncSession(sessionId).catch(() => {});
    }
    router.replace('/(tabs)');
  };

  if (!session) return null;

  const distance = distanceUnit === 'mi'
    ? metersToMiles(session.distance_m)
    : metersToKm(session.distance_m);
  const durationMs = session.ended_at_user && session.started_at_user
    ? new Date(session.ended_at_user).getTime() - new Date(session.started_at_user).getTime()
    : 0;
  const durationSeconds = Math.floor(durationMs / 1000);
  const fuelUnit = volumeUnit === 'gal' ? 'gal' : 'L';

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 140 + insets.bottom }]}>
        {/* Header */}
        <View style={styles.header}>
          <Ionicons name="checkmark-circle" size={48} color={colors.success} />
          <Text style={styles.title}>Drive Complete</Text>
        </View>

        {/* Cost */}
        <View style={styles.costCard}>
          <Text style={styles.costLabel}>ESTIMATED COST</Text>
          <Text style={styles.costValue}>${(session.est_cost ?? 0).toFixed(2)}</Text>
        </View>

        {/* Stats grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Ionicons name="speedometer-outline" size={20} color={colors.primary} />
            <Text style={styles.statValue}>{distance.toFixed(1)} {distanceUnit}</Text>
            <Text style={styles.statLabel}>Distance</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="time-outline" size={20} color={colors.primary} />
            <Text style={styles.statValue}>{formatDurationLabel(durationSeconds)}</Text>
            <Text style={styles.statLabel}>Duration</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="pause-circle-outline" size={20} color={colors.primary} />
            <Text style={styles.statValue}>{formatDurationLabel(session.stopped_seconds)}</Text>
            <Text style={styles.statLabel}>Stopped</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="water-outline" size={20} color={colors.primary} />
            <Text style={styles.statValue}>{(session.est_fuel_used ?? 0).toFixed(2)} {fuelUnit}</Text>
            <Text style={styles.statLabel}>Fuel Used</Text>
          </View>
        </View>

        {/* Details */}
        <View style={styles.detailsCard}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Gas Price</Text>
            <Text style={styles.detailValue}>
              ${(session.gas_price_value ?? 0).toFixed(3)}/{session.gas_price_unit === 'per_gal' ? 'gal' : 'L'}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Fuel Type</Text>
            <Text style={styles.detailValue}>{session.fuel_type}</Text>
          </View>
          {session.route_enabled === 1 && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Route Points</Text>
              <Text style={styles.detailValue}>{session.route_points_count}</Text>
            </View>
          )}
          {gapCount > 0 && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Tracking Gaps</Text>
              <Text style={styles.detailValue}>{gapCount}</Text>
            </View>
          )}
        </View>

        {/* Notes */}
        <View style={styles.notesCard}>
          <Text style={styles.notesLabel}>Notes</Text>
          <TextInput
            style={styles.notesInput}
            placeholder="Add notes about this trip..."
            placeholderTextColor={colors.textTertiary}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
          />
        </View>
      </ScrollView>

      {/* Done button */}
      <View style={[styles.footer, { paddingBottom: spacing.lg + insets.bottom }]}>
        <TouchableOpacity style={styles.doneButton} onPress={handleDone} activeOpacity={0.8}>
          <Text style={styles.doneButtonText}>Done</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg },

  header: { alignItems: 'center', marginBottom: spacing.xl },
  title: { ...typography.h1, color: colors.text, marginTop: spacing.sm },

  costCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  costLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textTertiary,
    letterSpacing: 2,
    marginBottom: spacing.xs,
  },
  costValue: {
    fontSize: 48,
    fontWeight: '800',
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },

  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  statCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    width: '48%',
    flexGrow: 1,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statValue: { ...typography.h3, color: colors.text, marginTop: 6 },
  statLabel: { ...typography.caption, color: colors.textTertiary, marginTop: 2 },

  detailsCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  detailLabel: { ...typography.body, color: colors.textSecondary },
  detailValue: { ...typography.body, color: colors.text, fontWeight: '600' },

  notesCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  notesLabel: { ...typography.label, color: colors.text, marginBottom: spacing.sm },
  notesInput: {
    ...typography.body,
    color: colors.text,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    minHeight: 80,
    textAlignVertical: 'top',
  },

  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  doneButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  doneButtonText: { color: colors.white, fontSize: 18, fontWeight: '600' },
});

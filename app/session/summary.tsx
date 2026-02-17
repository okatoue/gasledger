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
import { useColors } from '@/theme/useColors';
import { typography } from '@/theme/typography';
import { spacing, borderRadius } from '@/theme/spacing';

export default function SessionSummaryScreen() {
  const colors = useColors();
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
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 140 + insets.bottom }]}>
        {/* Header */}
        <View style={styles.header}>
          <Ionicons name="checkmark-circle" size={48} color={colors.success} />
          <Text style={[styles.title, { color: colors.text }]}>Drive Complete</Text>
        </View>

        {/* Cost */}
        <View style={[styles.costCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.costLabel, { color: colors.textTertiary }]}>ESTIMATED COST</Text>
          <Text style={[styles.costValue, { color: colors.text }]}>${(session.est_cost ?? 0).toFixed(2)}</Text>
        </View>

        {/* Stats grid */}
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="speedometer-outline" size={20} color={colors.primary} />
            <Text style={[styles.statValue, { color: colors.text }]}>{distance.toFixed(1)} {distanceUnit}</Text>
            <Text style={[styles.statLabel, { color: colors.textTertiary }]}>Distance</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="time-outline" size={20} color={colors.primary} />
            <Text style={[styles.statValue, { color: colors.text }]}>{formatDurationLabel(durationSeconds)}</Text>
            <Text style={[styles.statLabel, { color: colors.textTertiary }]}>Duration</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="pause-circle-outline" size={20} color={colors.primary} />
            <Text style={[styles.statValue, { color: colors.text }]}>{formatDurationLabel(session.stopped_seconds)}</Text>
            <Text style={[styles.statLabel, { color: colors.textTertiary }]}>Stopped</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="water-outline" size={20} color={colors.primary} />
            <Text style={[styles.statValue, { color: colors.text }]}>{(session.est_fuel_used ?? 0).toFixed(2)} {fuelUnit}</Text>
            <Text style={[styles.statLabel, { color: colors.textTertiary }]}>Fuel Used</Text>
          </View>
        </View>

        {/* Details */}
        <View style={[styles.detailsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.detailRow, { borderBottomColor: colors.border }]}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Gas Price</Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>
              ${(session.gas_price_value ?? 0).toFixed(3)}/{session.gas_price_unit === 'per_gal' ? 'gal' : 'L'}
            </Text>
          </View>
          <View style={[styles.detailRow, { borderBottomColor: colors.border }]}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Fuel Type</Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>{session.fuel_type}</Text>
          </View>
          {session.route_enabled === 1 && (
            <View style={[styles.detailRow, { borderBottomColor: colors.border }]}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Route Points</Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>{session.route_points_count}</Text>
            </View>
          )}
          {gapCount > 0 && (
            <View style={[styles.detailRow, { borderBottomColor: colors.border }]}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Tracking Gaps</Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>{gapCount}</Text>
            </View>
          )}
        </View>

        {/* Notes */}
        <View style={[styles.notesCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.notesLabel, { color: colors.text }]}>Notes</Text>
          <TextInput
            style={[styles.notesInput, { color: colors.text, backgroundColor: colors.surfaceSecondary }]}
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
      <View style={[styles.footer, { paddingBottom: spacing.lg + insets.bottom, backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        <TouchableOpacity style={[styles.doneButton, { backgroundColor: colors.primary }]} onPress={handleDone} activeOpacity={0.8}>
          <Text style={styles.doneButtonText}>Done</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.lg },

  header: { alignItems: 'center', marginBottom: spacing.xl },
  title: { ...typography.h1, marginTop: spacing.sm },

  costCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.lg,
    borderWidth: 1,
  },
  costLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: spacing.xs,
  },
  costValue: {
    fontSize: 48,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },

  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  statCard: {
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    width: '48%',
    flexGrow: 1,
    borderWidth: 1,
  },
  statValue: { ...typography.h3, marginTop: 6 },
  statLabel: { ...typography.caption, marginTop: 2 },

  detailsCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  detailLabel: { ...typography.body },
  detailValue: { ...typography.body, fontWeight: '600' },

  notesCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
  },
  notesLabel: { ...typography.label, marginBottom: spacing.sm },
  notesInput: {
    ...typography.body,
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
    borderTopWidth: 1,
  },
  doneButton: {
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  doneButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: '600' },
});

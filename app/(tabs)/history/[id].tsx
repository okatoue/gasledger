import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { sessionRepository, Session } from '@/db/repositories/sessionRepository';
import { trackingGapRepository, TrackingGap } from '@/db/repositories/trackingGapRepository';
import { syncService } from '@/services/sync/syncService';
import { vehicleService, Vehicle } from '@/services/vehicle/vehicleService';
import { useAuthStore } from '@/stores/authStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { metersToMiles, metersToKm } from '@/services/fuel/unitConverter';
import { calculateFuelUsed, calculateCost } from '@/services/fuel/fuelCalculator';
import { formatDurationLabel } from '@/utils/formatting';
import DropdownPicker from '@/components/common/Select';
import { FUEL_GRADES } from '@/utils/fuelGrades';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing, borderRadius } from '@/theme/spacing';

export default function SessionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const authSession = useAuthStore((s) => s.session);
  const distanceUnit = useSettingsStore((s) => s.distanceUnit);
  const volumeUnit = useSettingsStore((s) => s.volumeUnit);

  const [session, setSession] = useState<Session | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [gaps, setGaps] = useState<TrackingGap[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Edit state
  const [editGasPrice, setEditGasPrice] = useState('');
  const [editFuelGrade, setEditFuelGrade] = useState('');
  const [editVehicleId, setEditVehicleId] = useState('');
  const [editNotes, setEditNotes] = useState('');

  const loadData = useCallback(async () => {
    if (!id || !authSession) return;
    try {
      const [s, v, g] = await Promise.all([
        sessionRepository.getById(id),
        vehicleService.getByUser(authSession.user.id),
        trackingGapRepository.getBySession(id),
      ]);
      if (s) {
        setSession(s);
        setEditGasPrice(s.gas_price_value?.toString() ?? '');
        setEditFuelGrade(s.fuel_grade);
        setEditVehicleId(s.vehicle_id);
        setEditNotes(s.notes ?? '');
      }
      setVehicles(v);
      setGaps(g);
    } catch (error) {
      console.error('[SessionDetail] Load failed:', error);
    } finally {
      setLoading(false);
    }
  }, [id, authSession]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSave = async () => {
    if (!session) return;
    setSaving(true);
    try {
      const gasPriceValue = parseFloat(editGasPrice) || 0;
      const vehicle = vehicles.find((v) => v.id === editVehicleId);
      const effValue = vehicle?.efficiency_value ?? 0;
      const effUnit = vehicle?.efficiency_unit ?? 'mpg';

      const estFuelUsed = calculateFuelUsed(session.distance_m, effValue, effUnit);
      const estCost = calculateCost(estFuelUsed, gasPriceValue);

      await sessionRepository.update(session.id, {
        vehicleId: editVehicleId,
        fuelGrade: editFuelGrade,
        gasPriceValue,
        gasPriceUnit: session.gas_price_unit ?? 'per_gal',
        notes: editNotes.trim() || undefined,
        estFuelUsed,
        estCost,
      });

      syncService.syncSession(session.id).catch(() => {});

      setEditing(false);
      setLoading(true);
      await loadData();
    } catch (error) {
      console.error('[SessionDetail] Save failed:', error);
      Alert.alert('Error', 'Failed to save changes.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Session',
      'This will permanently delete this session and its route data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await sessionRepository.deleteSession(session!.id);
              syncService.syncSessionDelete(session!.id).catch(() => {});
              router.back();
            } catch (error) {
              console.error('[SessionDetail] Delete failed:', error);
              Alert.alert('Error', 'Failed to delete session.');
            }
          },
        },
      ],
    );
  };

  if (loading || !session) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const distance = distanceUnit === 'mi'
    ? metersToMiles(session.distance_m)
    : metersToKm(session.distance_m);
  const durationMs = session.ended_at_user && session.started_at_user
    ? new Date(session.ended_at_user).getTime() - new Date(session.started_at_user).getTime()
    : 0;
  const durationSeconds = Math.floor(durationMs / 1000);
  const fuelUnit = volumeUnit === 'gal' ? 'gal' : 'L';
  const vehicleName = vehicles.find((v) => v.id === session.vehicle_id);
  const vehicleLabel = vehicleName
    ? `${vehicleName.year} ${vehicleName.make} ${vehicleName.model}`
    : 'Unknown';

  const vehicleDropdownItems = vehicles.map((v) => ({
    text: `${v.year} ${v.make} ${v.model}`,
    value: v.id,
  }));

  let dateLabel = '';
  try {
    dateLabel = format(new Date(session.started_at_user), 'MMM d, yyyy h:mm a');
  } catch {
    dateLabel = session.started_at_user;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Date header */}
      <Text style={styles.dateHeader}>{dateLabel}</Text>

      {/* Cost card */}
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

      {/* Details / Edit section */}
      {editing ? (
        <View style={styles.detailsCard}>
          <Text style={styles.sectionTitle}>Edit Session</Text>

          <Text style={styles.fieldLabel}>Gas Price ($/unit)</Text>
          <TextInput
            style={styles.input}
            value={editGasPrice}
            onChangeText={setEditGasPrice}
            keyboardType="decimal-pad"
            placeholder="0.000"
            placeholderTextColor={colors.textTertiary}
          />

          <DropdownPicker
            label="Fuel Grade"
            placeholder="Select grade..."
            items={FUEL_GRADES}
            selectedValue={editFuelGrade}
            onSelect={(item) => setEditFuelGrade(item.value)}
          />

          <DropdownPicker
            label="Vehicle"
            placeholder="Select vehicle..."
            items={vehicleDropdownItems}
            selectedValue={editVehicleId}
            onSelect={(item) => setEditVehicleId(item.value)}
          />

          <Text style={styles.fieldLabel}>Notes</Text>
          <TextInput
            style={[styles.input, styles.notesInput]}
            value={editNotes}
            onChangeText={setEditNotes}
            placeholder="Add notes..."
            placeholderTextColor={colors.textTertiary}
            multiline
            numberOfLines={3}
          />

          <View style={styles.editActions}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => {
                setEditing(false);
                setEditGasPrice(session.gas_price_value?.toString() ?? '');
                setEditFuelGrade(session.fuel_grade);
                setEditVehicleId(session.vehicle_id);
                setEditNotes(session.notes ?? '');
              }}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveButton, saving && styles.disabledButton]}
              onPress={handleSave}
              disabled={saving}
            >
              <Text style={styles.saveButtonText}>{saving ? 'Saving...' : 'Save'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.detailsCard}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Gas Price</Text>
            <Text style={styles.detailValue}>
              ${(session.gas_price_value ?? 0).toFixed(3)}/{session.gas_price_unit === 'per_gal' ? 'gal' : 'L'}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Fuel Grade</Text>
            <Text style={styles.detailValue}>{session.fuel_grade}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Vehicle</Text>
            <Text style={styles.detailValue}>{vehicleLabel}</Text>
          </View>
          {session.route_enabled === 1 && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Route Points</Text>
              <Text style={styles.detailValue}>{session.route_points_count}</Text>
            </View>
          )}
        </View>
      )}

      {/* Tracking Gaps */}
      {!editing && gaps.length > 0 && (
        <View style={styles.detailsCard}>
          <Text style={styles.sectionTitle}>Tracking Gaps</Text>
          <Text style={styles.gapSummary}>
            {gaps.length} gap{gaps.length !== 1 ? 's' : ''} detected during this session
          </Text>
          {gaps.map((gap) => {
            const startTime = new Date(gap.started_at);
            const endTime = gap.ended_at ? new Date(gap.ended_at) : null;
            const durationS = endTime
              ? Math.floor((endTime.getTime() - startTime.getTime()) / 1000)
              : null;
            return (
              <View key={gap.id} style={styles.detailRow}>
                <Text style={styles.detailLabel}>
                  {format(startTime, 'h:mm:ss a')}
                </Text>
                <Text style={styles.detailValue}>
                  {durationS !== null ? formatDurationLabel(durationS) : 'Open'}
                </Text>
              </View>
            );
          })}
        </View>
      )}

      {/* Notes (read mode) */}
      {!editing && session.notes ? (
        <View style={styles.notesCard}>
          <Text style={styles.notesLabel}>Notes</Text>
          <Text style={styles.notesText}>{session.notes}</Text>
        </View>
      ) : null}

      {/* Action buttons */}
      {!editing && (
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.editButton} onPress={() => setEditing(true)}>
            <Ionicons name="pencil" size={18} color={colors.white} />
            <Text style={styles.editButtonText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
            <Ionicons name="trash" size={18} color={colors.white} />
            <Text style={styles.deleteButtonText}>Delete</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: 40 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },

  dateHeader: { ...typography.body, color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.md },

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

  sectionTitle: { ...typography.h3, color: colors.text, marginBottom: spacing.md },
  gapSummary: { ...typography.caption, color: colors.textSecondary, marginBottom: spacing.sm },
  fieldLabel: { ...typography.label, color: '#374151', marginBottom: spacing.xs + 2 },
  input: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: borderRadius.sm + 2,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
    color: colors.text,
  },
  notesInput: { minHeight: 80, textAlignVertical: 'top' },

  editActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  cancelButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelButtonText: { ...typography.button, color: colors.text },
  saveButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    backgroundColor: colors.primary,
  },
  saveButtonText: { ...typography.button, color: colors.white },
  disabledButton: { opacity: 0.6 },

  notesCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  notesLabel: { ...typography.label, color: colors.text, marginBottom: spacing.sm },
  notesText: { ...typography.body, color: colors.textSecondary },

  actionButtons: { flexDirection: 'row', gap: spacing.sm },
  editButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    gap: 6,
  },
  editButtonText: { ...typography.button, color: colors.white },
  deleteButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.error,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    gap: 6,
  },
  deleteButtonText: { ...typography.button, color: colors.white },
});

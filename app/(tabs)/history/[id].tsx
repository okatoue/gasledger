import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import MapView, { Polyline, Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { sessionRepository, Session } from '@/db/repositories/sessionRepository';
import { trackingGapRepository, TrackingGap } from '@/db/repositories/trackingGapRepository';
import { routePointRepository, RoutePoint } from '@/db/repositories/routePointRepository';
import { syncService } from '@/services/sync/syncService';
import { vehicleService, Vehicle } from '@/services/vehicle/vehicleService';
import { useAuthStore } from '@/stores/authStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { metersToMiles, metersToKm } from '@/services/fuel/unitConverter';
import { calculateFuelUsed, calculateCost } from '@/services/fuel/fuelCalculator';
import { formatDurationLabel } from '@/utils/formatting';
import DropdownPicker from '@/components/common/Select';
import { FUEL_TYPES } from '@/utils/fuelTypes';
import AdBanner from '@/components/common/AdBanner';
import { adUnits } from '@/config/adUnits';
import { BannerAdSize } from 'react-native-google-mobile-ads';
import { useColors } from '@/theme/useColors';
import { typography } from '@/theme/typography';
import { spacing, borderRadius } from '@/theme/spacing';

export default function SessionDetailScreen() {
  const colors = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const authSession = useAuthStore((s) => s.session);
  const distanceUnit = useSettingsStore((s) => s.distanceUnit);
  const volumeUnit = useSettingsStore((s) => s.volumeUnit);

  const [session, setSession] = useState<Session | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [gaps, setGaps] = useState<TrackingGap[]>([]);
  const [routePoints, setRoutePoints] = useState<RoutePoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Edit state
  const [editGasPrice, setEditGasPrice] = useState('');
  const [editFuelType, setEditFuelType] = useState('');
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
        setEditFuelType(s.fuel_type);
        setEditVehicleId(s.vehicle_id);
        setEditNotes(s.notes ?? '');
      }
      setVehicles(v);
      setGaps(g);
      // Fetch route points separately to avoid nested transaction conflicts
      const rp = await routePointRepository.getBySession(id);
      setRoutePoints(rp);
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
        fuelType: editFuelType,
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

  const routeCoords = useMemo(
    () => routePoints.map((p) => ({ latitude: p.latitude, longitude: p.longitude })),
    [routePoints],
  );

  const mapRegion = useMemo(() => {
    if (routeCoords.length === 0) return undefined;
    let minLat = routeCoords[0].latitude;
    let maxLat = routeCoords[0].latitude;
    let minLng = routeCoords[0].longitude;
    let maxLng = routeCoords[0].longitude;
    for (const c of routeCoords) {
      if (c.latitude < minLat) minLat = c.latitude;
      if (c.latitude > maxLat) maxLat = c.latitude;
      if (c.longitude < minLng) minLng = c.longitude;
      if (c.longitude > maxLng) maxLng = c.longitude;
    }
    const pad = 0.01;
    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: Math.max(maxLat - minLat, 0.005) + pad,
      longitudeDelta: Math.max(maxLng - minLng, 0.005) + pad,
    };
  }, [routeCoords]);

  if (loading || !session) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
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

  const showMap = session.route_enabled === 1 && routeCoords.length > 0 && mapRegion;

  let dateLabel = '';
  try {
    dateLabel = format(new Date(session.started_at_user), 'MMM d, yyyy h:mm a');
  } catch {
    dateLabel = session.started_at_user;
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      {/* Date header */}
      <Text style={[styles.dateHeader, { color: colors.textSecondary }]}>{dateLabel}</Text>

      {/* Cost card */}
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

      {/* Route map */}
      {showMap && (
        <View style={[styles.mapCard, { borderColor: colors.border, backgroundColor: colors.surface }]} pointerEvents="none">
          <MapView
            provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
            style={StyleSheet.absoluteFill}
            initialRegion={mapRegion}
            scrollEnabled={false}
            zoomEnabled={false}
            rotateEnabled={false}
            pitchEnabled={false}
            toolbarEnabled={false}
            liteMode={Platform.OS === 'android'}
          >
            <Polyline
              coordinates={routeCoords}
              strokeColor={colors.primary}
              strokeWidth={3}
            />
            <Marker
              coordinate={routeCoords[0]}
              pinColor="green"
            />
            <Marker
              coordinate={routeCoords[routeCoords.length - 1]}
              pinColor="red"
            />
          </MapView>
        </View>
      )}

      {/* Ad banner */}
      <AdBanner unitId={adUnits.sessionDetail} size={BannerAdSize.MEDIUM_RECTANGLE} />

      {/* Details / Edit section */}
      {editing ? (
        <View style={[styles.detailsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Edit Session</Text>

          <Text style={[styles.fieldLabel, { color: colors.text }]}>Gas Price ($/unit)</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, color: colors.text }]}
            value={editGasPrice}
            onChangeText={setEditGasPrice}
            keyboardType="decimal-pad"
            placeholder="0.000"
            placeholderTextColor={colors.textTertiary}
          />

          <DropdownPicker
            label="Fuel Type"
            placeholder="Select grade..."
            items={FUEL_TYPES}
            selectedValue={editFuelType}
            onSelect={(item) => setEditFuelType(item.value)}
          />

          <DropdownPicker
            label="Vehicle"
            placeholder="Select vehicle..."
            items={vehicleDropdownItems}
            selectedValue={editVehicleId}
            onSelect={(item) => setEditVehicleId(item.value)}
          />

          <Text style={[styles.fieldLabel, { color: colors.text }]}>Notes</Text>
          <TextInput
            style={[styles.input, styles.notesInput, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, color: colors.text }]}
            value={editNotes}
            onChangeText={setEditNotes}
            placeholder="Add notes..."
            placeholderTextColor={colors.textTertiary}
            multiline
            numberOfLines={3}
          />

          <View style={styles.editActions}>
            <TouchableOpacity
              style={[styles.cancelButton, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}
              onPress={() => {
                setEditing(false);
                setEditGasPrice(session.gas_price_value?.toString() ?? '');
                setEditFuelType(session.fuel_type);
                setEditVehicleId(session.vehicle_id);
                setEditNotes(session.notes ?? '');
              }}
            >
              <Text style={[styles.cancelButtonText, { color: colors.text }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveButton, { backgroundColor: colors.primary }, saving && styles.disabledButton]}
              onPress={handleSave}
              disabled={saving}
            >
              <Text style={[styles.saveButtonText, { color: colors.white }]}>{saving ? 'Saving...' : 'Save'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
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
          <View style={[styles.detailRow, { borderBottomColor: colors.border }]}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Vehicle</Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>{vehicleLabel}</Text>
          </View>
        </View>
      )}

      {/* Tracking Gaps */}
      {!editing && gaps.length > 0 && (
        <View style={[styles.detailsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Tracking Gaps</Text>
          <Text style={[styles.gapSummary, { color: colors.textSecondary }]}>
            {gaps.length} gap{gaps.length !== 1 ? 's' : ''} detected during this session
          </Text>
          {gaps.map((gap) => {
            const startTime = new Date(gap.started_at);
            const endTime = gap.ended_at ? new Date(gap.ended_at) : null;
            const durationS = endTime
              ? Math.floor((endTime.getTime() - startTime.getTime()) / 1000)
              : null;
            return (
              <View key={gap.id} style={[styles.detailRow, { borderBottomColor: colors.border }]}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
                  {format(startTime, 'h:mm:ss a')}
                </Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>
                  {durationS !== null ? formatDurationLabel(durationS) : 'Open'}
                </Text>
              </View>
            );
          })}
        </View>
      )}

      {/* Notes (read mode) */}
      {!editing && session.notes ? (
        <View style={[styles.notesCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.notesLabel, { color: colors.text }]}>Notes</Text>
          <Text style={[styles.notesText, { color: colors.textSecondary }]}>{session.notes}</Text>
        </View>
      ) : null}

      {/* Action buttons */}
      {!editing && (
        <View style={styles.actionButtons}>
          <TouchableOpacity style={[styles.editButton, { backgroundColor: colors.primary }]} onPress={() => setEditing(true)}>
            <Ionicons name="pencil" size={18} color={colors.white} />
            <Text style={[styles.editButtonText, { color: colors.white }]}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.deleteButton, { backgroundColor: colors.error }]} onPress={handleDelete}>
            <Ionicons name="trash" size={18} color={colors.white} />
            <Text style={[styles.deleteButtonText, { color: colors.white }]}>Delete</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: 40 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  dateHeader: { ...typography.body, textAlign: 'center', marginBottom: spacing.md },

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

  mapCard: {
    height: 200,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    marginBottom: spacing.lg,
    borderWidth: 1,
  },
  routeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
  },
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

  sectionTitle: { ...typography.h3, marginBottom: spacing.md },
  gapSummary: { ...typography.caption, marginBottom: spacing.sm },
  fieldLabel: { ...typography.label, marginBottom: spacing.xs + 2 },
  input: {
    borderRadius: borderRadius.sm + 2,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  notesInput: { minHeight: 80, textAlignVertical: 'top' },

  editActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  cancelButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    borderWidth: 1,
  },
  cancelButtonText: { ...typography.button },
  saveButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  saveButtonText: { ...typography.button },
  disabledButton: { opacity: 0.6 },

  notesCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
  },
  notesLabel: { ...typography.label, marginBottom: spacing.sm },
  notesText: { ...typography.body },

  actionButtons: { flexDirection: 'row', gap: spacing.sm },
  editButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    gap: 6,
  },
  editButtonText: { ...typography.button },
  deleteButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    gap: 6,
  },
  deleteButtonText: { ...typography.button },
});

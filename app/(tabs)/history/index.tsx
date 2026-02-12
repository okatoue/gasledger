import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { useSettingsStore } from '@/stores/settingsStore';
import { useAuthStore } from '@/stores/authStore';
import { sessionRepository, Session } from '@/db/repositories/sessionRepository';
import { vehicleService } from '@/services/vehicle/vehicleService';
import { formatDurationLabel, formatDistance, formatCurrency } from '@/utils/formatting';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing, borderRadius } from '@/theme/spacing';

export default function SessionHistoryScreen() {
  const router = useRouter();
  const distanceUnit = useSettingsStore((s) => s.distanceUnit);
  const session = useAuthStore((s) => s.session);

  const [sessions, setSessions] = useState<Session[]>([]);
  const [vehicleMap, setVehicleMap] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [monthlySpend, setMonthlySpend] = useState(0);
  const [monthlyDistance, setMonthlyDistance] = useState(0);

  const loadData = useCallback(async () => {
    if (!session) return;
    try {
      const [allSessions, vehicles, stats] = await Promise.all([
        sessionRepository.getByUser(session.user.id),
        vehicleService.getByUser(session.user.id),
        sessionRepository.getMonthlyStats(session.user.id),
      ]);
      const completed = allSessions.filter((s) => s.status === 'completed');
      setSessions(completed);
      setMonthlySpend(stats.totalSpend);
      setMonthlyDistance(stats.totalDistanceM);

      const map = new Map<string, string>();
      for (const v of vehicles) {
        map.set(v.id, `${v.year} ${v.make} ${v.model}`);
      }
      setVehicleMap(map);
    } catch (error) {
      console.error('[History] Failed to load sessions:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [session]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  const formatSessionDate = (isoString: string): string => {
    try {
      return format(new Date(isoString), 'MMM d, h:mm a');
    } catch {
      return isoString;
    }
  };

  const getSessionDuration = (s: Session): number => {
    if (!s.ended_at_user || !s.started_at_user) return 0;
    return Math.floor(
      (new Date(s.ended_at_user).getTime() - new Date(s.started_at_user).getTime()) / 1000,
    );
  };

  const renderItem = ({ item }: { item: Session }) => (
    <TouchableOpacity
      style={styles.tripCard}
      activeOpacity={0.7}
      onPress={() => router.push(`/history/${item.id}`)}
    >
      <View style={styles.tripLeft}>
        <Text style={styles.tripDate}>{formatSessionDate(item.started_at_user)}</Text>
        <Text style={styles.tripVehicle}>{vehicleMap.get(item.vehicle_id) ?? 'Unknown Vehicle'}</Text>
        <Text style={styles.tripDetail}>
          {formatDistance(item.distance_m, distanceUnit)} &middot; {formatDurationLabel(getSessionDuration(item))}
        </Text>
      </View>
      <View style={styles.tripRight}>
        <Text style={styles.tripCost}>${(item.est_cost ?? 0).toFixed(2)}</Text>
        <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={sessions}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.statsStrip}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{formatCurrency(monthlySpend)}</Text>
              <Text style={styles.statLabel}>This Month</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{formatDistance(monthlyDistance, distanceUnit)}</Text>
              <Text style={styles.statLabel}>Total Distance</Text>
            </View>
          </View>
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <Ionicons name="car-outline" size={48} color={colors.textTertiary} />
              <Text style={styles.emptyTitle}>No trips yet</Text>
              <Text style={styles.emptyMessage}>Start a drive from the Dashboard to see your history here.</Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  listContent: { padding: spacing.lg, paddingBottom: 40 },

  tripCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm + 2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tripLeft: { flex: 1 },
  tripDate: { ...typography.label, color: colors.text },
  tripVehicle: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  tripDetail: { ...typography.caption, color: colors.textTertiary, marginTop: 2 },
  tripRight: { flexDirection: 'row', alignItems: 'center', marginLeft: spacing.md },
  tripCost: { ...typography.h3, color: colors.text, marginRight: 4 },

  statsStrip: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    flexDirection: 'row',
    padding: spacing.md + 4,
    marginBottom: spacing.md,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { ...typography.h2, color: colors.text },
  statLabel: { ...typography.caption, color: colors.textTertiary, marginTop: 2 },
  statDivider: { width: 1, backgroundColor: colors.border, marginHorizontal: spacing.sm },

  empty: { alignItems: 'center', paddingTop: 80 },
  emptyTitle: { ...typography.h3, color: colors.text, marginTop: spacing.md },
  emptyMessage: { ...typography.body, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.sm, paddingHorizontal: spacing.xl },
});

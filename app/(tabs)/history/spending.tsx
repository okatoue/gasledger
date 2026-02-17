import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { BarChart } from 'react-native-gifted-charts';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/stores/authStore';
import { sessionRepository } from '@/db/repositories/sessionRepository';
import { formatCurrency } from '@/utils/formatting';
import ProGate from '@/components/common/ProGate';
import { useColors } from '@/theme/useColors';
import { typography } from '@/theme/typography';
import { spacing, borderRadius } from '@/theme/spacing';

type Period = '7d' | '30d' | '6m' | '1y';

const PERIODS: { key: Period; label: string }[] = [
  { key: '7d', label: '7 Days' },
  { key: '30d', label: '30 Days' },
  { key: '6m', label: '6 Months' },
  { key: '1y', label: '1 Year' },
];

export default function SpendingScreen() {
  const colors = useColors();
  const session = useAuthStore((s) => s.session);
  const [period, setPeriod] = useState<Period>('30d');
  const [loading, setLoading] = useState(true);
  const [barData, setBarData] = useState<{ value: number; label: string }[]>([]);
  const [totalSpend, setTotalSpend] = useState(0);

  const loadData = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    try {
      let data: { value: number; label: string }[] = [];

      if (period === '7d' || period === '30d') {
        const days = period === '7d' ? 7 : 30;
        const rows = await sessionRepository.getSpendingByDay(session.user.id, days);
        data = rows.map((r) => ({
          value: r.total,
          label: period === '7d' ? r.date.slice(5) : r.date.slice(8), // MM-DD or DD
        }));
      } else {
        const months = period === '6m' ? 6 : 12;
        const rows = await sessionRepository.getSpendingByMonth(session.user.id, months);
        data = rows.map((r) => ({
          value: r.total,
          label: r.month.slice(5), // MM
        }));
      }

      setBarData(data);
      setTotalSpend(data.reduce((sum, d) => sum + d.value, 0));
    } catch (error) {
      console.error('[Spending] Failed to load:', error);
    } finally {
      setLoading(false);
    }
  }, [session, period]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const avgSpend = barData.length > 0 ? totalSpend / barData.length : 0;

  return (
    <ProGate featureName="Spending Analytics">
      <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
        {/* Period selector */}
        <View style={styles.chipRow}>
          {PERIODS.map((p) => (
            <TouchableOpacity
              key={p.key}
              style={[
                styles.chip,
                { backgroundColor: colors.surfaceSecondary, borderColor: colors.border },
                period === p.key && { backgroundColor: colors.primary, borderColor: colors.primary },
              ]}
              onPress={() => setPeriod(p.key)}
            >
              <Text style={[
                styles.chipText,
                { color: colors.textSecondary },
                period === p.key && { color: colors.white, fontWeight: '600' },
              ]}>
                {p.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Chart */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : barData.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="bar-chart-outline" size={48} color={colors.textTertiary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No spending data for this period</Text>
          </View>
        ) : (
          <View style={[styles.chartCard, { backgroundColor: colors.surface }]}>
            <BarChart
              data={barData.map((d) => ({
                value: d.value,
                label: d.label,
                frontColor: colors.primary,
                topLabelComponent: () => (
                  <Text style={[styles.barTopLabel, { color: colors.textSecondary }]}>
                    {d.value > 0 ? `$${d.value.toFixed(0)}` : ''}
                  </Text>
                ),
              }))}
              barWidth={barData.length > 15 ? 12 : 20}
              spacing={barData.length > 15 ? 6 : 12}
              noOfSections={4}
              yAxisTextStyle={[styles.axisText, { color: colors.textTertiary }]}
              xAxisLabelTextStyle={[styles.axisText, { color: colors.textTertiary }]}
              hideRules
              yAxisThickness={0}
              xAxisThickness={1}
              xAxisColor={colors.border}
              isAnimated
              animationDuration={500}
            />
          </View>
        )}

        {/* Summary */}
        {!loading && barData.length > 0 && (
          <View style={[styles.summaryCard, { backgroundColor: colors.surface, shadowColor: colors.black }]}>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryLabel, { color: colors.textTertiary }]}>Total Spend</Text>
              <Text style={[styles.summaryValue, { color: colors.text }]}>{formatCurrency(totalSpend)}</Text>
            </View>
            <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryLabel, { color: colors.textTertiary }]}>
                Avg / {period === '6m' || period === '1y' ? 'Month' : 'Day'}
              </Text>
              <Text style={[styles.summaryValue, { color: colors.text }]}>{formatCurrency(avgSpend)}</Text>
            </View>
          </View>
        )}
      </ScrollView>
    </ProGate>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: 40 },

  chipRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  chip: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    alignItems: 'center',
  },
  chipText: { ...typography.caption },

  chartCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    overflow: 'hidden',
  },
  barTopLabel: {
    ...typography.caption,
    fontSize: 9,
    marginBottom: 2,
  },
  axisText: {
    ...typography.caption,
    fontSize: 10,
  },

  loadingContainer: {
    height: 250,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    height: 250,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  emptyText: {
    ...typography.body,
  },

  summaryCard: {
    borderRadius: borderRadius.lg,
    flexDirection: 'row',
    padding: spacing.md + 4,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryLabel: { ...typography.caption },
  summaryValue: { ...typography.h2, marginTop: 4 },
  summaryDivider: { width: 1, marginHorizontal: spacing.sm },
});

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { File, Paths } from 'expo-file-system';
import { shareAsync, isAvailableAsync } from 'expo-sharing';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/stores/authStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { sessionRepository, Session } from '@/db/repositories/sessionRepository';
import { vehicleService, Vehicle } from '@/services/vehicle/vehicleService';
import { exportSessionsCsv } from '@/services/export/csvExporter';
import DropdownPicker from '@/components/common/Select';
import ProGate from '@/components/common/ProGate';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing, borderRadius } from '@/theme/spacing';

type DateRange = 'all' | '7' | '30' | '90';

export default function ExportScreen() {
  const authSession = useAuthStore((s) => s.session);
  const distanceUnit = useSettingsStore((s) => s.distanceUnit);
  const volumeUnit = useSettingsStore((s) => s.volumeUnit);

  const [dateRange, setDateRange] = useState<DateRange>('all');
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!authSession) return;
    vehicleService.getByUser(authSession.user.id).then(setVehicles);
  }, [authSession]);

  const vehicleDropdownItems = [
    { text: 'All Vehicles', value: '__all__' },
    ...vehicles.map((v) => ({ text: `${v.year} ${v.make} ${v.model}`, value: v.id })),
  ];

  const handleExport = async () => {
    if (!authSession) return;
    setExporting(true);
    try {
      const allSessions = await sessionRepository.getByUser(authSession.user.id, 10000, 0);
      const completed = allSessions.filter((s) => s.status === 'completed');

      // Date filter
      let filtered = completed;
      if (dateRange !== 'all') {
        const days = parseInt(dateRange, 10);
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);
        filtered = filtered.filter((s) => new Date(s.started_at_user) >= cutoff);
      }

      // Vehicle filter
      if (selectedVehicleId && selectedVehicleId !== '__all__') {
        filtered = filtered.filter((s) => s.vehicle_id === selectedVehicleId);
      }

      if (filtered.length === 0) {
        Alert.alert('No Data', 'No sessions match the selected filters.');
        return;
      }

      const csvContent = exportSessionsCsv(filtered, vehicles, { distanceUnit, volumeUnit });

      const fileName = `gasledger_export_${new Date().toISOString().slice(0, 10)}.csv`;
      const file = new File(Paths.cache, fileName);
      file.write(csvContent);

      if (await isAvailableAsync()) {
        await shareAsync(file.uri, {
          mimeType: 'text/csv',
          dialogTitle: 'Export Sessions',
          UTI: 'public.comma-separated-values-text',
        });
      } else {
        Alert.alert('Export Complete', `CSV saved to: ${file.uri}`);
      }
    } catch (error) {
      console.error('[Export] Failed:', error);
      Alert.alert('Error', 'Failed to export data.');
    } finally {
      setExporting(false);
    }
  };

  const dateRangeOptions: { label: string; value: DateRange }[] = [
    { label: 'All Time', value: 'all' },
    { label: '7 Days', value: '7' },
    { label: '30 Days', value: '30' },
    { label: '90 Days', value: '90' },
  ];

  return (
    <ProGate featureName="CSV Export">
    <View style={styles.container}>
      {/* Date Range */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Date Range</Text>
        <View style={styles.chipRow}>
          {dateRangeOptions.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[styles.chip, dateRange === opt.value && styles.chipActive]}
              onPress={() => setDateRange(opt.value)}
            >
              <Text style={[styles.chipText, dateRange === opt.value && styles.chipTextActive]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Vehicle Filter */}
      <View style={styles.card}>
        <DropdownPicker
          label="Vehicle"
          placeholder="All Vehicles"
          items={vehicleDropdownItems}
          selectedValue={selectedVehicleId ?? '__all__'}
          onSelect={(item) => setSelectedVehicleId(item.value === '__all__' ? null : item.value)}
        />
      </View>

      {/* Export Button */}
      <TouchableOpacity
        style={[styles.exportButton, exporting && styles.disabledButton]}
        onPress={handleExport}
        disabled={exporting}
      >
        {exporting ? (
          <ActivityIndicator size="small" color={colors.white} />
        ) : (
          <Ionicons name="download-outline" size={20} color={colors.white} />
        )}
        <Text style={styles.exportButtonText}>
          {exporting ? 'Exporting...' : 'Export CSV'}
        </Text>
      </TouchableOpacity>

      <Text style={styles.infoText}>
        Sessions will be exported using your current unit preferences ({distanceUnit === 'mi' ? 'miles' : 'km'}, {volumeUnit === 'gal' ? 'gallons' : 'liters'}).
      </Text>
    </View>
    </ProGate>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.lg },

  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },

  sectionTitle: { ...typography.label, color: colors.text, marginBottom: spacing.sm },

  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: { ...typography.bodySmall, color: colors.textSecondary },
  chipTextActive: { color: colors.white, fontWeight: '600' },

  exportButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: spacing.md,
  },
  exportButtonText: { ...typography.button, color: colors.white },
  disabledButton: { opacity: 0.6 },

  infoText: {
    ...typography.caption,
    color: colors.textTertiary,
    textAlign: 'center',
    marginTop: spacing.md,
  },
});

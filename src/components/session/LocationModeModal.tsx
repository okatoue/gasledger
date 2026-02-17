import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/theme/useColors';
import { typography } from '@/theme/typography';
import { spacing, borderRadius } from '@/theme/spacing';

interface LocationModeModalProps {
  visible: boolean;
  onSelect: (mode: 'full' | 'limited') => void;
  onClose: () => void;
  requestBackgroundPermission: () => Promise<boolean>;
}

export default function LocationModeModal({
  visible,
  onSelect,
  onClose,
  requestBackgroundPermission,
}: LocationModeModalProps) {
  const colors = useColors();
  const [selected, setSelected] = useState<'full' | 'limited'>('full');
  const [loading, setLoading] = useState(false);

  const handleContinue = async () => {
    if (selected === 'full') {
      setLoading(true);
      const granted = await requestBackgroundPermission();
      setLoading(false);
      if (!granted) {
        Alert.alert(
          'Background Permission Denied',
          'Switching to Limited Mode. Tracking may pause when the app goes to the background.',
        );
        onSelect('limited');
        return;
      }
    }
    onSelect(selected);
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={[styles.sheet, { backgroundColor: colors.surface }]} onPress={() => {}}>
          <Text style={[styles.title, { color: colors.text }]}>Location Tracking Mode</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Choose how GasLedger tracks your drives</Text>

          <TouchableOpacity
            style={[
              styles.optionCard,
              { borderColor: colors.border },
              selected === 'full' && { borderColor: colors.primary, backgroundColor: colors.primaryBg },
            ]}
            onPress={() => setSelected('full')}
            activeOpacity={0.7}
          >
            <View style={styles.optionHeader}>
              <View style={[styles.radio, { borderColor: colors.primary }]}>
                {selected === 'full' && <View style={[styles.radioFill, { backgroundColor: colors.primary }]} />}
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.optionTitleRow}>
                  <Text style={[styles.optionTitle, { color: colors.text }, selected === 'full' && { color: colors.primary }]}>
                    Full Tracking
                  </Text>
                  <View style={[styles.recommendedBadge, { backgroundColor: colors.primaryLight }]}>
                    <Text style={styles.recommendedText}>Recommended</Text>
                  </View>
                </View>
                <Text style={[styles.optionDesc, { color: colors.textSecondary }]}>
                  Tracks your drive reliably in the background, even when the screen is off
                </Text>
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.optionCard,
              { borderColor: colors.border },
              selected === 'limited' && { borderColor: colors.primary, backgroundColor: colors.primaryBg },
            ]}
            onPress={() => setSelected('limited')}
            activeOpacity={0.7}
          >
            <View style={styles.optionHeader}>
              <View style={[styles.radio, { borderColor: colors.primary }]}>
                {selected === 'limited' && <View style={[styles.radioFill, { backgroundColor: colors.primary }]} />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.optionTitle, { color: colors.text }, selected === 'limited' && { color: colors.primary }]}>
                  Limited Mode
                </Text>
                <Text style={[styles.optionDesc, { color: colors.textSecondary }]}>
                  May pause tracking when the app goes to the background
                </Text>
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.continueButton, { backgroundColor: colors.primary }, loading && styles.disabledButton]}
            onPress={handleContinue}
            disabled={loading}
            activeOpacity={0.8}
          >
            <Text style={styles.continueButtonText}>
              {loading ? 'Requesting Permission...' : 'Continue'}
            </Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: spacing.lg,
    paddingBottom: 40,
  },
  title: { ...typography.h2, marginBottom: 4 },
  subtitle: { ...typography.bodySmall, marginBottom: spacing.lg },

  optionCard: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  optionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  optionTitle: { ...typography.label },
  optionDesc: { ...typography.caption, marginTop: 4 },

  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  radioFill: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },

  recommendedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  recommendedText: { fontSize: 11, fontWeight: '600', color: '#FFFFFF' },

  continueButton: {
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  disabledButton: { opacity: 0.6 },
  continueButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: '600' },
});

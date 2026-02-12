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
import { colors } from '@/theme/colors';
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
        <Pressable style={styles.sheet} onPress={() => {}}>
          <Text style={styles.title}>Location Tracking Mode</Text>
          <Text style={styles.subtitle}>Choose how GasLedger tracks your drives</Text>

          <TouchableOpacity
            style={[styles.optionCard, selected === 'full' && styles.optionCardSelected]}
            onPress={() => setSelected('full')}
            activeOpacity={0.7}
          >
            <View style={styles.optionHeader}>
              <View style={styles.radio}>
                {selected === 'full' && <View style={styles.radioFill} />}
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.optionTitleRow}>
                  <Text style={[styles.optionTitle, selected === 'full' && styles.optionTitleSelected]}>
                    Full Tracking
                  </Text>
                  <View style={styles.recommendedBadge}>
                    <Text style={styles.recommendedText}>Recommended</Text>
                  </View>
                </View>
                <Text style={styles.optionDesc}>
                  Tracks your drive reliably in the background, even when the screen is off
                </Text>
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.optionCard, selected === 'limited' && styles.optionCardSelected]}
            onPress={() => setSelected('limited')}
            activeOpacity={0.7}
          >
            <View style={styles.optionHeader}>
              <View style={styles.radio}>
                {selected === 'limited' && <View style={styles.radioFill} />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.optionTitle, selected === 'limited' && styles.optionTitleSelected]}>
                  Limited Mode
                </Text>
                <Text style={styles.optionDesc}>
                  May pause tracking when the app goes to the background
                </Text>
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.continueButton, loading && styles.disabledButton]}
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
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: spacing.lg,
    paddingBottom: 40,
  },
  title: { ...typography.h2, color: colors.text, marginBottom: 4 },
  subtitle: { ...typography.bodySmall, color: colors.textSecondary, marginBottom: spacing.lg },

  optionCard: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  optionCardSelected: {
    borderColor: colors.primary,
    backgroundColor: '#EFF6FF',
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
  optionTitle: { ...typography.label, color: colors.text },
  optionTitleSelected: { color: colors.primary },
  optionDesc: { ...typography.caption, color: colors.textSecondary, marginTop: 4 },

  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  radioFill: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },

  recommendedBadge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  recommendedText: { fontSize: 11, fontWeight: '600', color: colors.white },

  continueButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  disabledButton: { opacity: 0.6 },
  continueButtonText: { color: colors.white, fontSize: 18, fontWeight: '600' },
});

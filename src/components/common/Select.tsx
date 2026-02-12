import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  TextInput,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing, borderRadius } from '@/theme/spacing';

export interface DropdownItem {
  text: string;
  value: string;
}

interface DropdownPickerProps {
  label: string;
  placeholder: string;
  items: DropdownItem[];
  selectedValue: string | null;
  onSelect: (item: DropdownItem) => void;
  disabled?: boolean;
  loading?: boolean;
  error?: string;
}

export default function DropdownPicker({
  label,
  placeholder,
  items,
  selectedValue,
  onSelect,
  disabled = false,
  loading = false,
  error,
}: DropdownPickerProps) {
  const [visible, setVisible] = useState(false);
  const [search, setSearch] = useState('');

  const selectedItem = useMemo(
    () => items.find((i) => i.value === selectedValue),
    [items, selectedValue],
  );

  const filtered = useMemo(() => {
    if (!search) return items;
    const q = search.toLowerCase();
    return items.filter((i) => i.text.toLowerCase().includes(q));
  }, [items, search]);

  const handleSelect = (item: DropdownItem) => {
    onSelect(item);
    setVisible(false);
    setSearch('');
  };

  const handleOpen = () => {
    if (disabled || loading) return;
    setSearch('');
    setVisible(true);
  };

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity
        style={[
          styles.trigger,
          disabled && styles.triggerDisabled,
          error ? styles.triggerError : null,
        ]}
        onPress={handleOpen}
        activeOpacity={disabled || loading ? 1 : 0.7}
      >
        <Text
          style={[styles.triggerText, !selectedItem && styles.placeholderText]}
          numberOfLines={1}
        >
          {selectedItem ? selectedItem.text : placeholder}
        </Text>
        {loading ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <Ionicons name="chevron-down" size={18} color={colors.textTertiary} />
        )}
      </TouchableOpacity>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <Modal visible={visible} transparent animationType="slide">
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setVisible(false)}
        >
          <View style={styles.sheet} onStartShouldSetResponder={() => true}>
            {/* Header */}
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{label}</Text>
              <TouchableOpacity onPress={() => setVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            {/* Search */}
            {items.length > 10 && (
              <TextInput
                style={styles.searchInput}
                placeholder="Search..."
                placeholderTextColor={colors.textTertiary}
                value={search}
                onChangeText={setSearch}
                autoCorrect={false}
              />
            )}

            {/* List */}
            <FlatList
              data={filtered}
              keyExtractor={(item) => item.value}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => {
                const isSelected = item.value === selectedValue;
                return (
                  <TouchableOpacity
                    style={[styles.option, isSelected && styles.optionSelected]}
                    onPress={() => handleSelect(item)}
                  >
                    <Text
                      style={[styles.optionText, isSelected && styles.optionTextSelected]}
                      numberOfLines={2}
                    >
                      {item.text}
                    </Text>
                    {isSelected && (
                      <Ionicons name="checkmark" size={20} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <Text style={styles.emptyText}>No results found</Text>
              }
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: 12 },
  label: {
    ...typography.label,
    color: '#374151',
    marginBottom: spacing.xs + 2,
  },
  trigger: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: borderRadius.sm + 2,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  triggerDisabled: { opacity: 0.5 },
  triggerError: { borderColor: colors.error },
  triggerText: {
    fontSize: 16,
    color: colors.text,
    flex: 1,
    marginRight: 8,
  },
  placeholderText: { color: colors.textTertiary },
  errorText: {
    ...typography.caption,
    color: colors.error,
    marginTop: 4,
  },

  // Modal
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
    height: '70%',
    paddingBottom: 34,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sheetTitle: { ...typography.h3, color: colors.text },
  searchInput: {
    margin: spacing.md,
    marginBottom: spacing.sm,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: borderRadius.sm + 2,
    padding: 10,
    fontSize: 15,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
  },

  // Options
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  optionSelected: { backgroundColor: colors.surfaceSecondary },
  optionText: { ...typography.body, color: colors.text, flex: 1, marginRight: 8 },
  optionTextSelected: { color: colors.primary, fontWeight: '600' },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    padding: spacing.xl,
  },
});

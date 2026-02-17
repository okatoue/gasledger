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
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/theme/useColors';
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
  const colors = useColors();
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
    Keyboard.dismiss();
    setSearch('');
    setVisible(true);
  };

  return (
    <View style={styles.wrapper}>
      <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
      <TouchableOpacity
        style={[
          styles.trigger,
          { backgroundColor: colors.surfaceSecondary, borderColor: colors.border },
          disabled && styles.triggerDisabled,
          error ? { borderColor: colors.error } : null,
        ]}
        onPress={handleOpen}
        activeOpacity={disabled || loading ? 1 : 0.7}
      >
        <Text
          style={[
            styles.triggerText,
            { color: colors.text },
            !selectedItem && { color: colors.textTertiary },
          ]}
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
      {error ? <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text> : null}

      <Modal visible={visible} transparent animationType="slide">
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setVisible(false)}
        >
          <View
            style={[styles.sheet, { backgroundColor: colors.surface }]}
            onStartShouldSetResponder={() => true}
          >
            {/* Header */}
            <View style={[styles.sheetHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.sheetTitle, { color: colors.text }]}>{label}</Text>
              <TouchableOpacity onPress={() => setVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            {/* Search */}
            {items.length > 10 && (
              <TextInput
                style={[
                  styles.searchInput,
                  { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, color: colors.text },
                ]}
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
                    style={[
                      styles.option,
                      { borderBottomColor: colors.border },
                      isSelected && { backgroundColor: colors.surfaceSecondary },
                    ]}
                    onPress={() => handleSelect(item)}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        { color: colors.text },
                        isSelected && { color: colors.primary, fontWeight: '600' },
                      ]}
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
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No results found</Text>
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
    marginBottom: spacing.xs + 2,
  },
  trigger: {
    borderRadius: borderRadius.sm + 2,
    padding: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  triggerDisabled: { opacity: 0.5 },
  triggerText: {
    fontSize: 16,
    flex: 1,
    marginRight: 8,
  },
  errorText: {
    ...typography.caption,
    marginTop: 4,
  },

  // Modal
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
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
  },
  sheetTitle: { ...typography.h3 },
  searchInput: {
    margin: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: borderRadius.sm + 2,
    padding: 10,
    fontSize: 15,
    borderWidth: 1,
  },

  // Options
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  optionText: { ...typography.body, flex: 1, marginRight: 8 },
  emptyText: {
    ...typography.body,
    textAlign: 'center',
    padding: spacing.xl,
  },
});

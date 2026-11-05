import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fontSize, radius, spacing } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import { useDebounce } from '@/hooks/useDebounce';
import { getErrorMessage } from '@/services';

import { EmptyState } from './EmptyState';
import { Loader } from './Loader';
import { SearchBar } from './SearchBar';

export interface PickerItem {
  id: string;
  title: string;
  subtitle?: string;
}

interface Props {
  label: string;
  placeholder: string;
  icon: keyof typeof Ionicons.glyphMap;
  /** Currently selected item (shown in the field). */
  selected?: PickerItem | null;
  /** Loads the options; called again (debounced) as the user types in the search box. */
  fetchItems: (search: string) => Promise<PickerItem[]>;
  onSelect: (item: PickerItem) => void;
  error?: string;
  disabled?: boolean;
}

/** A form field that opens a searchable full-screen list, e.g. to choose a lead or a property. */
export function EntityPicker({ label, placeholder, icon, selected, fetchItems, onSelect, error, disabled }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [items, setItems] = useState<PickerItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const debounced = useDebounce(search.trim(), 300);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    fetchItems(debounced)
      .then((res) => !cancelled && setItems(res))
      .catch((e) => !cancelled && setLoadError(getErrorMessage(e)))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, debounced]);

  const close = () => {
    setOpen(false);
    setSearch('');
  };

  return (
    <View style={styles.wrap}>
      <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        disabled={disabled}
        onPress={() => setOpen(true)}
        style={[styles.field, { backgroundColor: colors.surface, borderColor: error ? colors.danger : colors.border, opacity: disabled ? 0.6 : 1 }]}
      >
        <Ionicons name={icon} size={18} color={colors.textMuted} style={styles.icon} />
        <View style={styles.flex}>
          <Text style={{ fontSize: fontSize.md, color: selected ? colors.text : colors.textMuted }} numberOfLines={1}>
            {selected?.title ?? placeholder}
          </Text>
          {selected?.subtitle ? (
            <Text style={{ fontSize: fontSize.xs + 1, color: colors.textMuted }} numberOfLines={1}>
              {selected.subtitle}
            </Text>
          ) : null}
        </View>
        {disabled ? null : <Ionicons name="chevron-down" size={18} color={colors.textMuted} />}
      </Pressable>
      {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}

      <Modal visible={open} animationType="slide" onRequestClose={close}>
        <View style={[styles.flex, { backgroundColor: colors.background, paddingTop: insets.top }]}>
          <View style={[styles.modalTop, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
            <Pressable accessibilityRole="button" accessibilityLabel="Close" hitSlop={10} onPress={close} style={styles.close}>
              <Ionicons name="close" size={24} color={colors.text} />
            </Pressable>
            <SearchBar value={search} onChangeText={setSearch} placeholder={`Search ${label.toLowerCase()}`} />
          </View>
          {loading ? (
            <Loader inline />
          ) : loadError ? (
            <EmptyState icon="cloud-offline-outline" title="Couldn't load" message={loadError} actionLabel="Close" onAction={close} />
          ) : (
            <FlatList
              data={items}
              keyExtractor={(i) => i.id}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xl, flexGrow: 1 }}
              ListEmptyComponent={<EmptyState icon="search-outline" title="No results" message="Try a different search." />}
              renderItem={({ item }) => (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    onSelect(item);
                    close();
                  }}
                  style={({ pressed }) => [styles.row, { borderBottomColor: colors.border, backgroundColor: pressed ? colors.surfaceAlt : 'transparent' }]}
                >
                  <View style={styles.flex}>
                    <Text style={{ fontSize: fontSize.md, fontWeight: '600', color: colors.text }}>{item.title}</Text>
                    {item.subtitle ? <Text style={{ fontSize: fontSize.sm, color: colors.textMuted, marginTop: 2 }}>{item.subtitle}</Text> : null}
                  </View>
                  {selected?.id === item.id ? <Ionicons name="checkmark-circle" size={20} color={colors.primary} /> : null}
                </Pressable>
              )}
            />
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  wrap: { marginBottom: spacing.lg },
  label: { fontSize: fontSize.sm, fontWeight: '600', marginBottom: spacing.xs + 2 },
  field: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing.md, minHeight: 48, paddingVertical: spacing.xs },
  icon: { marginRight: spacing.sm },
  error: { fontSize: fontSize.xs + 1, marginTop: spacing.xs },
  modalTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth },
  close: { padding: spacing.xs },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md + 2, borderBottomWidth: StyleSheet.hairlineWidth },
});

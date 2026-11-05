import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fontSize, radius, spacing } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import { useDebounce } from '@/hooks/useDebounce';
import { getErrorMessage, propertyService } from '@/services';
import type { Property } from '@/types';
import { formatPrice } from '@/utils/format';

import { Button } from './Button';
import { SearchBar } from './SearchBar';

interface Props {
  label?: string;
  value: string;
  selectedName?: string;
  onChange: (property: Property) => void;
  disabled?: boolean;
  error?: string;
}

/** Field that opens a searchable list of properties. */
export function PropertyPicker({ label = 'Property', value, selectedName, onChange, disabled, error }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const debounced = useDebounce(search.trim(), 300);
  const [items, setItems] = useState<Property[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [name, setName] = useState(selectedName);

  useEffect(() => setName(selectedName), [selectedName]);

  const load = useCallback(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    propertyService
      .list({ search: debounced || undefined, limit: 50 })
      .then((res) => !cancelled && setItems(res.data))
      .catch((e) => !cancelled && setLoadError(getErrorMessage(e)))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [debounced]);

  useEffect(() => {
    if (!open) return;
    return load();
  }, [open, load]);

  const pick = (p: Property) => {
    setName(p.title);
    onChange(p);
    setOpen(false);
    setSearch('');
  };

  return (
    <View style={styles.wrap}>
      <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${name ?? 'not selected'}`}
        disabled={disabled}
        onPress={() => setOpen(true)}
        style={[styles.field, { backgroundColor: colors.surface, borderColor: error ? colors.danger : colors.border, opacity: disabled ? 0.65 : 1 }]}
      >
        <Ionicons name="business-outline" size={18} color={colors.textMuted} style={styles.icon} />
        <Text style={[styles.value, { color: value ? colors.text : colors.textMuted }]} numberOfLines={1}>
          {value ? name ?? 'Selected property' : 'Select a property'}
        </Text>
        {!disabled ? <Ionicons name="chevron-down" size={18} color={colors.textMuted} /> : null}
      </Pressable>
      {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}

      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={[styles.modal, { backgroundColor: colors.background, paddingTop: insets.top + spacing.md }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Select property</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Close" hitSlop={10} onPress={() => setOpen(false)}>
              <Ionicons name="close" size={26} color={colors.text} />
            </Pressable>
          </View>
          <View style={styles.searchWrap}>
            <SearchBar value={search} onChangeText={setSearch} placeholder="Search title or location" />
          </View>

          {loading && items.length === 0 ? (
            <ActivityIndicator style={styles.center} color={colors.primary} />
          ) : loadError ? (
            <View style={styles.center}>
              <Text style={{ color: colors.danger, marginBottom: spacing.md, textAlign: 'center' }}>{loadError}</Text>
              <Button title="Try again" small variant="outline" onPress={load} />
            </View>
          ) : (
            <FlatList
              data={items}
              keyExtractor={(p) => p.id}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xl }}
              ListEmptyComponent={
                <Text style={[styles.empty, { color: colors.textMuted }]}>{debounced ? 'No properties match your search.' : 'No properties yet. Add a property first.'}</Text>
              }
              renderItem={({ item }) => (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => pick(item)}
                  style={({ pressed }) => [styles.item, { borderBottomColor: colors.border }, pressed && { backgroundColor: colors.surfaceAlt }]}
                >
                  <View style={[styles.itemIcon, { backgroundColor: colors.primarySoft }]}>
                    <Ionicons name="home-outline" size={18} color={colors.primary} />
                  </View>
                  <View style={styles.itemText}>
                    <Text style={[styles.itemName, { color: colors.text }]} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text style={{ color: colors.textMuted, fontSize: fontSize.sm }} numberOfLines={1}>
                      {item.location} · {formatPrice(item.price, item.listingType)} · {item.status}
                    </Text>
                  </View>
                  {item.id === value ? <Ionicons name="checkmark-circle" size={22} color={colors.primary} /> : null}
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
  wrap: { marginBottom: spacing.lg },
  label: { fontSize: fontSize.sm, fontWeight: '600', marginBottom: spacing.sm },
  field: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing.md, minHeight: 48 },
  icon: { marginRight: spacing.sm },
  value: { flex: 1, fontSize: fontSize.md },
  error: { fontSize: fontSize.xs + 1, marginTop: spacing.xs + 2 },
  modal: { flex: 1 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, marginBottom: spacing.md },
  modalTitle: { fontSize: fontSize.xl, fontWeight: '700' },
  searchWrap: { flexDirection: 'row', paddingHorizontal: spacing.lg, marginBottom: spacing.md },
  center: { padding: spacing.xxl, alignItems: 'center' },
  empty: { textAlign: 'center', padding: spacing.xxl, fontSize: fontSize.md },
  item: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth },
  itemIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  itemText: { flex: 1, marginLeft: spacing.md },
  itemName: { fontSize: fontSize.md, fontWeight: '600' },
});

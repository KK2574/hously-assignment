import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fontSize, radius, spacing } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import { useDebounce } from '@/hooks/useDebounce';
import { getErrorMessage, leadService } from '@/services';
import type { Lead } from '@/types';

import { Avatar } from './Avatar';
import { Button } from './Button';
import { SearchBar } from './SearchBar';

interface Props {
  label?: string;
  /** Selected lead id. */
  value: string;
  /** Name to show for the selected lead before the picker has loaded anything. */
  selectedName?: string;
  onChange: (lead: Lead) => void;
  disabled?: boolean;
  error?: string;
}

/** Field that opens a searchable list of leads. */
export function LeadPicker({ label = 'Lead', value, selectedName, onChange, disabled, error }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const debounced = useDebounce(search.trim(), 300);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [name, setName] = useState(selectedName);

  useEffect(() => setName(selectedName), [selectedName]);

  const load = React.useCallback(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    leadService
      .list({ search: debounced || undefined, limit: 50 })
      .then((res) => !cancelled && setLeads(res.data))
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

  const pick = (lead: Lead) => {
    setName(lead.name);
    onChange(lead);
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
        <Ionicons name="person-outline" size={18} color={colors.textMuted} style={styles.icon} />
        <Text style={[styles.value, { color: value ? colors.text : colors.textMuted }]} numberOfLines={1}>
          {value ? name ?? 'Selected lead' : 'Select a lead'}
        </Text>
        {!disabled ? <Ionicons name="chevron-down" size={18} color={colors.textMuted} /> : null}
      </Pressable>
      {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}

      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={[styles.modal, { backgroundColor: colors.background, paddingTop: insets.top + spacing.md }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Select lead</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Close" hitSlop={10} onPress={() => setOpen(false)}>
              <Ionicons name="close" size={26} color={colors.text} />
            </Pressable>
          </View>
          <View style={styles.searchWrap}>
            <SearchBar value={search} onChangeText={setSearch} placeholder="Search name, mobile or email" />
          </View>

          {loading && leads.length === 0 ? (
            <ActivityIndicator style={styles.center} color={colors.primary} />
          ) : loadError ? (
            <View style={styles.center}>
              <Text style={{ color: colors.danger, marginBottom: spacing.md, textAlign: 'center' }}>{loadError}</Text>
              <Button title="Try again" small variant="outline" onPress={load} />
            </View>
          ) : (
            <FlatList
              data={leads}
              keyExtractor={(l) => l.id}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xl }}
              ListEmptyComponent={
                <Text style={[styles.empty, { color: colors.textMuted }]}>{debounced ? 'No leads match your search.' : 'No leads yet. Add a lead first.'}</Text>
              }
              renderItem={({ item }) => (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => pick(item)}
                  style={({ pressed }) => [styles.item, { borderBottomColor: colors.border }, pressed && { backgroundColor: colors.surfaceAlt }]}
                >
                  <Avatar name={item.name} size={38} />
                  <View style={styles.itemText}>
                    <Text style={[styles.itemName, { color: colors.text }]} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text style={{ color: colors.textMuted, fontSize: fontSize.sm }} numberOfLines={1}>
                      {item.mobile} · {item.stage}
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
  itemText: { flex: 1, marginLeft: spacing.md },
  itemName: { fontSize: fontSize.md, fontWeight: '600' },
});

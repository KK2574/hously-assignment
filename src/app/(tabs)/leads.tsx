import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { Avatar, Badge, Banner, Button, Card, EmptyState, ErrorState, Loader, OptionChips, ScreenHeader, SearchBar } from '@/components';
import { EXECUTIVES, LEAD_PRIORITIES, LEAD_SOURCES, LEAD_STAGES, PRIORITY_COLORS, STAGE_COLORS } from '@/constants';
import { fontSize, radius, spacing } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import { useDebounce } from '@/hooks/useDebounce';
import { usePaginatedList } from '@/hooks/usePaginatedList';
import { leadService } from '@/services';
import type { Lead, LeadFilters, LeadPriority, LeadSource, LeadStage } from '@/types';
import { callNumber, openWhatsApp } from '@/utils/contact';
import { timeAgo } from '@/utils/format';

export default function LeadsScreen() {
  const { colors } = useTheme();
  const router = useRouter();

  const [search, setSearch] = useState('');
  const [stage, setStage] = useState<LeadStage | undefined>();
  const [source, setSource] = useState<LeadSource | undefined>();
  const [priority, setPriority] = useState<LeadPriority | undefined>();
  const [assignedTo, setAssignedTo] = useState<string | undefined>();
  const [showFilters, setShowFilters] = useState(false);

  const debouncedSearch = useDebounce(search.trim(), 350);
  const filters = useMemo<LeadFilters>(
    () => ({ search: debouncedSearch || undefined, stage, source, priority, assignedTo }),
    [debouncedSearch, stage, source, priority, assignedTo],
  );
  const activeExtra = [source, priority, assignedTo].filter(Boolean).length;
  const hasFilters = !!filters.search || !!stage || activeExtra > 0;

  const list = usePaginatedList<Lead>((page, limit) => leadService.list({ ...filters, page, limit }), {
    deps: [debouncedSearch, stage, source, priority, assignedTo],
  });

  const clearFilters = () => {
    setSearch('');
    setStage(undefined);
    setSource(undefined);
    setPriority(undefined);
    setAssignedTo(undefined);
  };

  const openLead = (id: string) => router.push({ pathname: '/lead/[id]', params: { id } });

  const header = (
    <View style={[styles.top, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
      <View style={styles.searchRow}>
        <SearchBar value={search} onChangeText={setSearch} placeholder="Search name, mobile or email" />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Filters${activeExtra ? `, ${activeExtra} active` : ''}`}
          onPress={() => setShowFilters((v) => !v)}
          style={[
            styles.filterBtn,
            { backgroundColor: showFilters || activeExtra ? colors.primarySoft : colors.surface, borderColor: showFilters || activeExtra ? colors.primary : colors.border },
          ]}
        >
          <Ionicons name="options-outline" size={20} color={showFilters || activeExtra ? colors.primary : colors.textMuted} />
          {activeExtra > 0 ? (
            <View style={[styles.dot, { backgroundColor: colors.primary }]}>
              <Text style={styles.dotText}>{activeExtra}</Text>
            </View>
          ) : null}
        </Pressable>
      </View>
      <View style={styles.chipRow}>
        <OptionChips allLabel="All" options={LEAD_STAGES} value={stage} onChange={setStage} colorFor={(s) => STAGE_COLORS[s]} />
      </View>
      {showFilters ? (
        <View style={styles.extra}>
          <Text style={[styles.filterLabel, { color: colors.textMuted }]}>Source</Text>
          <OptionChips allLabel="Any" options={LEAD_SOURCES} value={source} onChange={setSource} />
          <Text style={[styles.filterLabel, { color: colors.textMuted }]}>Priority</Text>
          <OptionChips allLabel="Any" options={LEAD_PRIORITIES} value={priority} onChange={setPriority} colorFor={(p) => PRIORITY_COLORS[p]} />
          <Text style={[styles.filterLabel, { color: colors.textMuted }]}>Assigned to</Text>
          <OptionChips allLabel="Anyone" options={EXECUTIVES} value={assignedTo as (typeof EXECUTIVES)[number] | undefined} onChange={setAssignedTo} />
        </View>
      ) : null}
    </View>
  );

  const addButton = <Button title="Add" icon="add" small onPress={() => router.push({ pathname: '/lead/[id]', params: { id: 'new' } })} />;

  let body: React.ReactNode;
  if (list.loading) {
    body = <Loader inline message="Loading leads…" />;
  } else if (list.error && list.items.length === 0) {
    body = <ErrorState message={list.error} onRetry={list.reload} />;
  } else {
    body = (
      <FlatList
        data={list.items}
        keyExtractor={(l) => l.id}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={list.refreshing} onRefresh={list.refresh} tintColor={colors.primary} colors={[colors.primary]} />}
        onEndReached={list.loadMore}
        onEndReachedThreshold={0.4}
        ListHeaderComponent={
          <>
            {list.error ? <Banner tone="error" message={list.error} /> : null}
            <Text style={[styles.count, { color: colors.textMuted }]}>
              {list.total} {list.total === 1 ? 'lead' : 'leads'}
              {list.fetching ? '  · updating…' : ''}
            </Text>
          </>
        }
        ListEmptyComponent={
          hasFilters ? (
            <EmptyState icon="search-outline" title="No matching leads" message="Try a different search or clear the filters." actionLabel="Clear filters" onAction={clearFilters} />
          ) : (
            <EmptyState
              icon="people-outline"
              title="No leads yet"
              message="Add your first lead to start tracking your pipeline."
              actionLabel="Add lead"
              onAction={() => router.push({ pathname: '/lead/[id]', params: { id: 'new' } })}
            />
          )
        }
        ListFooterComponent={
          list.loadingMore ? (
            <ActivityIndicator style={styles.footer} color={colors.primary} />
          ) : list.loadMoreError ? (
            <View style={styles.footer}>
              <Text style={{ color: colors.danger, fontSize: fontSize.sm, marginBottom: spacing.sm }}>{list.loadMoreError}</Text>
              <Button title="Retry" variant="outline" small onPress={list.loadMore} />
            </View>
          ) : undefined
        }
        renderItem={({ item }) => <LeadRow lead={item} onPress={() => openLead(item.id)} />}
      />
    );
  }

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      <ScreenHeader title="Leads" right={addButton} />
      {header}
      {body}
    </View>
  );
}

function LeadRow({ lead, onPress }: { lead: Lead; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Card onPress={onPress} style={styles.card}>
      <View style={styles.rowTop}>
        <Avatar name={lead.name} size={44} />
        <View style={styles.rowText}>
          <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
            {lead.name}
          </Text>
          <Text style={[styles.meta, { color: colors.textMuted }]} numberOfLines={1}>
            {lead.mobile}
            {lead.email ? ` · ${lead.email}` : ''}
          </Text>
        </View>
        <View style={[styles.prio, { backgroundColor: `${PRIORITY_COLORS[lead.priority]}24` }]}>
          <Text style={{ color: PRIORITY_COLORS[lead.priority], fontSize: fontSize.xs + 1, fontWeight: '700' }}>{lead.priority}</Text>
        </View>
      </View>
      <View style={styles.rowBottom}>
        <Badge label={lead.stage} color={STAGE_COLORS[lead.stage]} />
        <Text style={[styles.meta, styles.grow, { color: colors.textMuted }]} numberOfLines={1}>
          {'  '}
          {lead.source} · {lead.assignedTo.split(' ')[0]} · {timeAgo(lead.createdAt)}
        </Text>
        <IconAction icon="call" label={`Call ${lead.name}`} color={colors.primary} onPress={() => callNumber(lead.mobile)} />
        <IconAction icon="logo-whatsapp" label={`WhatsApp ${lead.name}`} color="#16A34A" onPress={() => openWhatsApp(lead.mobile)} />
      </View>
    </Card>
  );
}

function IconAction({ icon, label, color, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; color: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} hitSlop={6} onPress={onPress} style={[styles.iconAction, { backgroundColor: `${color}1F` }]}>
      <Ionicons name={icon} size={16} color={color} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  top: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  filterBtn: { width: 44, height: 44, borderRadius: radius.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  dot: { position: 'absolute', top: -5, right: -5, minWidth: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  dotText: { color: '#FFFFFF', fontSize: 10, fontWeight: '800' },
  chipRow: { marginTop: spacing.md },
  extra: { marginTop: spacing.md },
  filterLabel: { fontSize: fontSize.xs + 1, fontWeight: '700', textTransform: 'uppercase', marginTop: spacing.sm, marginBottom: spacing.xs + 2 },
  listContent: { padding: spacing.lg, paddingBottom: spacing.xxl * 2, flexGrow: 1 },
  count: { fontSize: fontSize.sm, marginBottom: spacing.md },
  footer: { padding: spacing.lg, alignItems: 'center' },
  card: { marginBottom: spacing.md, padding: spacing.md + 2 },
  rowTop: { flexDirection: 'row', alignItems: 'center' },
  rowText: { flex: 1, marginLeft: spacing.md },
  name: { fontSize: fontSize.md, fontWeight: '700' },
  meta: { fontSize: fontSize.sm, marginTop: 2 },
  grow: { flex: 1 },
  prio: { paddingHorizontal: spacing.sm + 2, paddingVertical: 4, borderRadius: radius.pill },
  rowBottom: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.md },
  iconAction: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', marginLeft: spacing.sm },
});

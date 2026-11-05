import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { Banner, Button, EmptyState, ErrorState, Loader, ScreenHeader, VisitCard } from '@/components';
import { fontSize, radius, spacing } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import { useFetch } from '@/hooks/useFetch';
import { siteVisitService } from '@/services';
import type { SiteVisitFilters } from '@/types';

type Scope = NonNullable<SiteVisitFilters['scope']>;

const TABS: { scope: Scope; label: string; emptyTitle: string; emptyMessage: string }[] = [
  { scope: 'upcoming', label: 'Upcoming', emptyTitle: 'No upcoming visits', emptyMessage: 'Schedule a site visit for one of your leads.' },
  { scope: 'past', label: 'Past', emptyTitle: 'No past visits', emptyMessage: 'Completed and cancelled visits will show up here.' },
  { scope: 'all', label: 'All', emptyTitle: 'No site visits yet', emptyMessage: 'Schedule your first site visit.' },
];

export default function VisitsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [scope, setScope] = useState<Scope>('upcoming');

  const add = () => router.push({ pathname: '/visit/[id]', params: { id: 'new' } });

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      <ScreenHeader title="Site visits" back right={<Button title="Schedule" icon="add" small onPress={add} />} />
      <View style={[styles.tabs, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        {TABS.map((t) => {
          const active = t.scope === scope;
          return (
            <Pressable
              key={t.scope}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              onPress={() => setScope(t.scope)}
              style={[styles.tab, { backgroundColor: active ? colors.primary : colors.surfaceAlt }]}
            >
              <Text style={{ color: active ? colors.primaryText : colors.textMuted, fontWeight: '700', fontSize: fontSize.sm }}>{t.label}</Text>
            </Pressable>
          );
        })}
      </View>
      {/* Keyed by scope so each tab has its own loading state. */}
      <VisitList key={scope} scope={scope} />
    </View>
  );
}

function VisitList({ scope }: { scope: Scope }) {
  const { colors } = useTheme();
  const router = useRouter();
  const tab = TABS.find((t) => t.scope === scope)!;
  const { data, loading, refreshing, error, reload, refresh } = useFetch(() => siteVisitService.list({ scope }));

  if (loading) return <Loader inline message="Loading site visits…" />;
  if (!data) return <ErrorState message={error ?? undefined} onRetry={reload} />;

  return (
    <FlatList
      data={data}
      keyExtractor={(v) => v.id}
      contentContainerStyle={styles.list}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} colors={[colors.primary]} />}
      ListHeaderComponent={
        <>
          {error ? <Banner tone="error" message={`Could not refresh: ${error}`} /> : null}
          {data.length > 0 ? (
            <Text style={[styles.count, { color: colors.textMuted }]}>
              {data.length} {data.length === 1 ? 'visit' : 'visits'}
            </Text>
          ) : null}
        </>
      }
      ListEmptyComponent={
        <EmptyState
          icon="calendar-outline"
          title={tab.emptyTitle}
          message={tab.emptyMessage}
          actionLabel="Schedule visit"
          onAction={() => router.push({ pathname: '/visit/[id]', params: { id: 'new' } })}
        />
      }
      renderItem={({ item }) => <VisitCard visit={item} onPress={() => router.push({ pathname: '/visit/[id]', params: { id: item.id } })} />}
    />
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  tabs: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth },
  tab: { flex: 1, alignItems: 'center', paddingVertical: spacing.sm + 1, borderRadius: radius.pill },
  list: { padding: spacing.lg, paddingBottom: spacing.xxl * 2, flexGrow: 1 },
  count: { fontSize: fontSize.sm, marginBottom: spacing.md },
});

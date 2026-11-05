import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { Banner, Button, ConfirmDialog, EmptyState, ErrorState, FollowUpCard, Loader, ScreenHeader } from '@/components';
import { fontSize, radius, spacing } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import { useFetch } from '@/hooks/useFetch';
import { followUpService, getErrorMessage } from '@/services';
import type { FollowUp, FollowUpView } from '@/types';

const TABS: { view: FollowUpView; label: string; emptyTitle: string; emptyMessage: string }[] = [
  { view: 'today', label: 'Today', emptyTitle: 'Nothing due today', emptyMessage: 'You are all caught up for today.' },
  { view: 'upcoming', label: 'Upcoming', emptyTitle: 'No upcoming follow-ups', emptyMessage: 'Schedule a follow-up to stay on top of your leads.' },
  { view: 'overdue', label: 'Overdue', emptyTitle: 'Nothing overdue', emptyMessage: 'Great job, no follow-ups have been missed.' },
  { view: 'all', label: 'All', emptyTitle: 'No follow-ups yet', emptyMessage: 'Schedule your first follow-up.' },
];

export default function FollowUpsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [view, setView] = useState<FollowUpView>('today');

  const add = () => router.push({ pathname: '/followup/[id]', params: { id: 'new' } });

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      <ScreenHeader title="Follow-ups" right={<Button title="Schedule" icon="add" small onPress={add} />} />
      <View style={[styles.tabs, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        {TABS.map((t) => {
          const active = t.view === view;
          return (
            <Pressable
              key={t.view}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              onPress={() => setView(t.view)}
              style={[styles.tab, { backgroundColor: active ? colors.primary : colors.surfaceAlt }]}
            >
              <Text style={{ color: active ? colors.primaryText : colors.textMuted, fontWeight: '700', fontSize: fontSize.sm }}>{t.label}</Text>
            </Pressable>
          );
        })}
      </View>
      {/* Keyed by view so each tab gets its own loading state instead of showing the previous tab's rows. */}
      <FollowUpList key={view} view={view} />
    </View>
  );
}

function FollowUpList({ view }: { view: FollowUpView }) {
  const { colors } = useTheme();
  const router = useRouter();
  const tab = TABS.find((t) => t.view === view)!;
  const { data, loading, refreshing, error, reload, refresh, silentReload } = useFetch(() => followUpService.list({ view }));

  const [target, setTarget] = useState<FollowUp | null>(null);
  const [completing, setCompleting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  if (loading) return <Loader inline message="Loading follow-ups…" />;
  if (!data) return <ErrorState message={error ?? undefined} onRetry={reload} />;

  const complete = async () => {
    if (!target) return;
    setCompleting(true);
    try {
      await followUpService.complete(target.id);
      setToast(`Follow-up with ${target.leadName} completed`);
      setTarget(null);
      await silentReload();
    } catch (e) {
      setTarget(null);
      Alert.alert('Could not complete follow-up', getErrorMessage(e));
    } finally {
      setCompleting(false);
    }
  };

  return (
    <>
      <FlatList
        data={data}
        keyExtractor={(f) => f.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} colors={[colors.primary]} />}
        ListHeaderComponent={
          <>
            {toast ? <Banner tone="success" message={toast} /> : null}
            {error ? <Banner tone="error" message={`Could not refresh: ${error}`} /> : null}
            {data.length > 0 ? (
              <Text style={[styles.count, { color: colors.textMuted }]}>
                {data.length} {data.length === 1 ? 'follow-up' : 'follow-ups'}
              </Text>
            ) : null}
          </>
        }
        ListEmptyComponent={
          <EmptyState
            icon="alarm-outline"
            title={tab.emptyTitle}
            message={tab.emptyMessage}
            actionLabel={view === 'overdue' ? undefined : 'Schedule follow-up'}
            onAction={() => router.push({ pathname: '/followup/[id]', params: { id: 'new' } })}
          />
        }
        renderItem={({ item }) => (
          <FollowUpCard
            followUp={item}
            onPress={() => router.push({ pathname: '/followup/[id]', params: { id: item.id } })}
            onComplete={() => {
              setToast(null);
              setTarget(item);
            }}
          />
        )}
      />
      <ConfirmDialog
        visible={!!target}
        title="Mark as completed?"
        message={target ? `Follow-up (${target.type}) with ${target.leadName} will be marked as done.` : ''}
        confirmLabel="Complete"
        loading={completing}
        onConfirm={complete}
        onCancel={() => setTarget(null)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  tabs: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth },
  tab: { flex: 1, alignItems: 'center', paddingVertical: spacing.sm + 1, borderRadius: radius.pill },
  list: { padding: spacing.lg, paddingBottom: spacing.xxl * 2, flexGrow: 1 },
  count: { fontSize: fontSize.sm, marginBottom: spacing.md },
});

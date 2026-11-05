import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { Banner, Button, Card, EmptyState, ErrorState, Loader, ScreenHeader } from '@/components';
import { fontSize, radius, spacing } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import { useFetch } from '@/hooks/useFetch';
import { getErrorMessage, leadService, notificationService } from '@/services';
import type { AppNotification, NotificationType } from '@/types';
import { timeAgo } from '@/utils/format';

const TYPE_ICONS: Record<NotificationType, keyof typeof Ionicons.glyphMap> = {
  followup: 'alarm-outline',
  visit: 'calendar-outline',
  lead: 'person-add-outline',
  system: 'information-circle-outline',
};

type Filter = 'all' | 'unread';

export default function NotificationsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>('all');
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const { data, loading, refreshing, error, reload, refresh, silentReload } = useFetch(() => notificationService.list());

  if (loading) {
    return (
      <View style={[styles.flex, { backgroundColor: colors.background }]}>
        <ScreenHeader title="Notifications" back />
        <Loader inline message="Loading notifications…" />
      </View>
    );
  }
  if (!data) {
    return (
      <View style={[styles.flex, { backgroundColor: colors.background }]}>
        <ScreenHeader title="Notifications" back />
        <ErrorState message={error ?? undefined} onRetry={reload} />
      </View>
    );
  }

  const all = data.data;
  const unread = data.unreadCount;
  const items = filter === 'unread' ? all.filter((n) => !n.read) : all;

  const run = async (action: () => Promise<unknown>, failTitle: string, success?: string) => {
    if (busy) return;
    setBusy(true);
    try {
      await action();
      await silentReload();
      if (success) setToast(success);
    } catch (e) {
      Alert.alert(failTitle, getErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const open = async (n: AppNotification) => {
    if (!n.read) notificationService.markRead(n.id, true).then(silentReload).catch(() => undefined);
    if (!n.refId) return;
    if (n.type === 'followup') router.push({ pathname: '/followup/[id]', params: { id: n.refId } });
    else if (n.type === 'visit') router.push({ pathname: '/visit/[id]', params: { id: n.refId } });
    else if (n.type === 'lead') router.push({ pathname: '/lead/[id]', params: { id: n.refId } });
  };

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      <ScreenHeader
        title="Notifications"
        subtitle={unread > 0 ? `${unread} unread` : 'All caught up'}
        back
        right={
          unread > 0 ? (
            <Pressable accessibilityRole="button" hitSlop={10} disabled={busy} onPress={() => run(() => notificationService.markAllRead(), 'Could not update notifications', 'All notifications marked as read')}>
              <Text style={{ color: colors.primary, fontWeight: '700', fontSize: fontSize.sm }}>Mark all read</Text>
            </Pressable>
          ) : undefined
        }
      />

      <View style={[styles.tabs, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        {(['all', 'unread'] as Filter[]).map((f) => {
          const active = filter === f;
          return (
            <Pressable
              key={f}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              onPress={() => setFilter(f)}
              style={[styles.tab, { backgroundColor: active ? colors.primary : colors.surfaceAlt }]}
            >
              <Text style={{ color: active ? colors.primaryText : colors.textMuted, fontWeight: '700', fontSize: fontSize.sm }}>
                {f === 'all' ? `All (${all.length})` : `Unread (${unread})`}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <FlatList
        data={items}
        keyExtractor={(n) => n.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} colors={[colors.primary]} />}
        ListHeaderComponent={
          <>
            {toast ? <Banner tone="success" message={toast} /> : null}
            {error ? <Banner tone="error" message={`Could not refresh: ${error}`} /> : null}
            {/* Simulated: there is no real lead source behind this demo backend. */}
            <Card style={styles.sim}>
              <View style={styles.simText}>
                <Text style={[styles.simTitle, { color: colors.text }]}>Simulate incoming lead</Text>
                <Text style={{ color: colors.textMuted, fontSize: fontSize.sm, lineHeight: 18 }}>Demo only: creates a new lead and a notification, as if an enquiry arrived from your website.</Text>
              </View>
              <Button
                title="Simulate"
                icon="flash-outline"
                small
                variant="secondary"
                disabled={busy}
                onPress={() =>
                  run(async () => {
                    const lead = await leadService.simulate();
                    setToast(`New lead received: ${lead.name}`);
                  }, 'Could not simulate a lead')
                }
              />
            </Card>
          </>
        }
        ListEmptyComponent={
          filter === 'unread' ? (
            <EmptyState icon="checkmark-done-outline" title="No unread notifications" message="You have read everything." actionLabel="Show all" onAction={() => setFilter('all')} />
          ) : (
            <EmptyState icon="notifications-off-outline" title="No notifications yet" message="Follow-up reminders, site visit alerts and new leads will appear here." />
          )
        }
        renderItem={({ item: n }) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${n.read ? '' : 'Unread. '}${n.title}. ${n.message}`}
            onPress={() => open(n)}
            style={({ pressed }) => [
              styles.row,
              { backgroundColor: n.read ? colors.surface : colors.primarySoft, borderColor: n.read ? colors.border : colors.primary },
              pressed && { opacity: 0.85 },
            ]}
          >
            <View style={[styles.icon, { backgroundColor: n.read ? colors.surfaceAlt : colors.surface }]}>
              <Ionicons name={TYPE_ICONS[n.type] ?? 'notifications-outline'} size={20} color={colors.primary} />
            </View>
            <View style={styles.text}>
              <View style={styles.titleRow}>
                {!n.read ? <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} /> : null}
                <Text style={[styles.title, { color: colors.text, fontWeight: n.read ? '600' : '800' }]} numberOfLines={1}>
                  {n.title}
                </Text>
              </View>
              <Text style={[styles.message, { color: colors.textMuted }]} numberOfLines={2}>
                {n.message}
              </Text>
              <Text style={[styles.time, { color: colors.textMuted }]}>{timeAgo(n.createdAt)}</Text>
            </View>
            <View style={styles.side}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={n.read ? 'Mark as unread' : 'Mark as read'}
                hitSlop={8}
                disabled={busy}
                onPress={() => run(() => notificationService.markRead(n.id, !n.read), 'Could not update notification')}
              >
                <Ionicons name={n.read ? 'mail-unread-outline' : 'mail-open-outline'} size={20} color={colors.textMuted} />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Delete notification"
                hitSlop={8}
                disabled={busy}
                style={styles.sideGap}
                onPress={() => run(() => notificationService.remove(n.id), 'Could not delete notification')}
              >
                <Ionicons name="trash-outline" size={20} color={colors.danger} />
              </Pressable>
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  tabs: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth },
  tab: { flex: 1, alignItems: 'center', paddingVertical: spacing.sm + 1, borderRadius: radius.pill },
  list: { padding: spacing.lg, paddingBottom: spacing.xxl * 2, flexGrow: 1 },
  sim: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.lg, padding: spacing.md + 2 },
  simText: { flex: 1, marginRight: spacing.md },
  simTitle: { fontSize: fontSize.md, fontWeight: '700', marginBottom: 2 },
  row: { flexDirection: 'row', alignItems: 'flex-start', borderWidth: 1, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md },
  icon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md },
  text: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center' },
  unreadDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  title: { flex: 1, fontSize: fontSize.md },
  message: { fontSize: fontSize.sm, marginTop: 2, lineHeight: 18 },
  time: { fontSize: fontSize.xs + 1, marginTop: spacing.xs + 2 },
  side: { alignItems: 'center', marginLeft: spacing.sm },
  sideGap: { marginTop: spacing.md },
});

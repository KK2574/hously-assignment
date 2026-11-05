import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar, Banner, Card, EmptyState, ErrorState, Loader, StatCard } from '@/components';
import { STAGE_COLORS } from '@/constants';
import { fontSize, radius, spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useFetch } from '@/hooks/useFetch';
import { dashboardService } from '@/services';
import { ACTIVITY_ICONS } from '@/utils/activity';
import { timeAgo } from '@/utils/format';

type IconName = keyof typeof Ionicons.glyphMap;

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function DashboardScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data, loading, refreshing, error, reload, refresh } = useFetch(dashboardService.summary);

  const firstName = user?.name.split(' ')[0] ?? '';
  const unread = data?.totals.unreadNotifications ?? 0;

  const header = (
    <View style={[styles.header, { paddingTop: insets.top + spacing.md, backgroundColor: colors.primary }]}>
      <View style={styles.headerRow}>
        <Avatar name={user?.name ?? '?'} uri={user?.avatarUrl} size={44} />
        <View style={styles.headerText}>
          <Text style={styles.headerSub}>{greeting()}</Text>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {firstName}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Notifications, ${unread} unread`}
          style={styles.bell}
          onPress={() => router.push('/notifications')}
        >
          <Ionicons name="notifications-outline" size={22} color="#FFFFFF" />
          {unread > 0 ? (
            <View style={[styles.bellBadge, { borderColor: colors.primary }]}>
              <Text style={styles.bellBadgeText}>{unread > 9 ? '9+' : unread}</Text>
            </View>
          ) : null}
        </Pressable>
      </View>
      <Text style={styles.date}>
        {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.flex, { backgroundColor: colors.background }]}>
        {header}
        <Loader inline message="Loading your dashboard…" />
      </View>
    );
  }

  if (!data) {
    return (
      <View style={[styles.flex, { backgroundColor: colors.background }]}>
        {header}
        <ErrorState message={error ?? undefined} onRetry={reload} />
      </View>
    );
  }

  const { totals, leadsByStage, recentActivity } = data;
  const maxStage = Math.max(...leadsByStage.map((s) => s.count), 1);
  const hasLeads = totals.leads > 0;

  const quickActions: { label: string; icon: IconName; onPress: () => void }[] = [
    { label: 'Add lead', icon: 'person-add-outline', onPress: () => router.push('/lead/new') },
    { label: 'Add property', icon: 'add-circle-outline', onPress: () => router.push('/property/new') },
    { label: 'Schedule', icon: 'alarm-outline', onPress: () => router.push({ pathname: '/followup/[id]', params: { id: 'new' } }) },
    { label: 'Site visits', icon: 'calendar-outline', onPress: () => router.push('/visits') },
  ];

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      {header}
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} colors={[colors.primary]} />}
      >
        {error ? <Banner tone="error" message={`Could not refresh: ${error}`} /> : null}

        {/* Summary cards */}
        <View style={styles.grid}>
          <View style={styles.gridItem}>
            <StatCard label="Properties" value={totals.properties} icon="business-outline" color={colors.primary} onPress={() => router.push('/properties')} />
          </View>
          <View style={styles.gridItem}>
            <StatCard label="Total leads" value={totals.leads} icon="people-outline" color="#7C3AED" onPress={() => router.push('/leads')} />
          </View>
          <View style={styles.gridItem}>
            <StatCard label="Active leads" value={totals.activeLeads} icon="pulse-outline" color="#0891B2" onPress={() => router.push('/leads')} />
          </View>
          <View style={styles.gridItem}>
            <StatCard label="Follow-ups today" value={totals.followUpsToday} icon="alarm-outline" color="#D97706" onPress={() => router.push('/followups')} />
          </View>
          <View style={styles.gridItem}>
            <StatCard label="Closed deals" value={totals.closedDeals} icon="trophy-outline" color="#16A34A" onPress={() => router.push('/leads')} />
          </View>
          <View style={styles.gridItem}>
            <StatCard label="Upcoming visits" value={totals.upcomingVisits} icon="calendar-outline" color="#DB2777" onPress={() => router.push('/visits')} />
          </View>
        </View>

        {/* Quick actions */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick actions</Text>
        <View style={styles.actions}>
          {quickActions.map((a) => (
            <Pressable
              key={a.label}
              accessibilityRole="button"
              accessibilityLabel={a.label}
              onPress={a.onPress}
              style={({ pressed }) => [styles.action, { opacity: pressed ? 0.7 : 1 }]}
            >
              <View style={[styles.actionIcon, { backgroundColor: colors.primarySoft }]}>
                <Ionicons name={a.icon} size={24} color={colors.primary} />
              </View>
              <Text style={[styles.actionLabel, { color: colors.text }]} numberOfLines={1}>
                {a.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Lead pipeline */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Leads by stage</Text>
        <Card>
          {hasLeads ? (
            leadsByStage.map((s, i) => (
              <View key={s.stage} style={i > 0 ? styles.barRow : undefined}>
                <View style={styles.barLabelRow}>
                  <Text style={[styles.barLabel, { color: colors.text }]}>{s.stage}</Text>
                  <Text style={[styles.barCount, { color: colors.textMuted }]}>{s.count}</Text>
                </View>
                <View style={[styles.barTrack, { backgroundColor: colors.surfaceAlt }]}>
                  <View
                    style={[
                      styles.barFill,
                      { width: `${(s.count / maxStage) * 100}%`, backgroundColor: STAGE_COLORS[s.stage] },
                    ]}
                  />
                </View>
              </View>
            ))
          ) : (
            <EmptyState icon="stats-chart-outline" title="No leads yet" message="Add your first lead to see the pipeline." actionLabel="Add lead" onAction={() => router.push('/lead/new')} />
          )}
        </Card>

        {/* Activity feed */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent activity</Text>
        <Card style={styles.feedCard}>
          {recentActivity.length === 0 ? (
            <EmptyState icon="time-outline" title="No activity yet" message="Lead updates, follow-ups and site visits will show up here." />
          ) : (
            recentActivity.map((a, i) => (
              <Pressable
                key={a.id}
                accessibilityRole="button"
                onPress={() => router.push({ pathname: '/lead/[id]', params: { id: a.leadId } })}
                style={({ pressed }) => [
                  styles.feedRow,
                  i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
                  pressed && { opacity: 0.7 },
                ]}
              >
                <View style={[styles.feedIcon, { backgroundColor: colors.primarySoft }]}>
                  <Ionicons name={ACTIVITY_ICONS[a.kind] ?? 'ellipse-outline'} size={18} color={colors.primary} />
                </View>
                <View style={styles.feedText}>
                  <Text style={[styles.feedTitle, { color: colors.text }]} numberOfLines={1}>
                    {a.title}
                    {a.leadName ? ` · ${a.leadName}` : ''}
                  </Text>
                  {a.description ? (
                    <Text style={[styles.feedDesc, { color: colors.textMuted }]} numberOfLines={1}>
                      {a.description}
                    </Text>
                  ) : null}
                </View>
                <Text style={[styles.feedTime, { color: colors.textMuted }]}>{timeAgo(a.createdAt)}</Text>
              </Pressable>
            ))
          )}
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg + 2 },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  headerText: { flex: 1, marginLeft: spacing.md },
  headerSub: { color: 'rgba(255,255,255,0.8)', fontSize: fontSize.sm },
  headerTitle: { color: '#FFFFFF', fontSize: fontSize.xl, fontWeight: '800' },
  date: { color: 'rgba(255,255,255,0.8)', fontSize: fontSize.sm, marginTop: spacing.md },
  bell: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  bellBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: '#F5B700',
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellBadgeText: { fontSize: 10, fontWeight: '800', color: '#0B1F44' },

  content: { padding: spacing.lg, paddingBottom: spacing.xxl * 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  gridItem: { width: '48%', flexGrow: 1 },

  sectionTitle: { fontSize: fontSize.lg, fontWeight: '700', marginTop: spacing.xl, marginBottom: spacing.md },

  actions: { flexDirection: 'row', justifyContent: 'space-between' },
  action: { flex: 1, alignItems: 'center' },
  actionIcon: { width: 56, height: 56, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xs + 2 },
  actionLabel: { fontSize: fontSize.xs + 1, fontWeight: '600' },

  barRow: { marginTop: spacing.md + 2 },
  barLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  barLabel: { fontSize: fontSize.sm, fontWeight: '600' },
  barCount: { fontSize: fontSize.sm, fontWeight: '700' },
  barTrack: { height: 8, borderRadius: 4, overflow: 'hidden' },
  barFill: { height: 8, borderRadius: 4, minWidth: 4 },

  feedCard: { paddingVertical: spacing.xs, paddingHorizontal: spacing.md },
  feedRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md },
  feedIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md },
  feedText: { flex: 1 },
  feedTitle: { fontSize: fontSize.md - 1, fontWeight: '600' },
  feedDesc: { fontSize: fontSize.sm, marginTop: 2 },
  feedTime: { fontSize: fontSize.xs + 1, marginLeft: spacing.sm },
});

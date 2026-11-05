import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { Avatar, Button, Card, ConfirmDialog, ScreenHeader } from '@/components';
import { fontSize, radius, spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { getErrorMessage } from '@/services';
import type { NotificationPreferences } from '@/types';
import { useTheme, type ThemeMode } from '@/context/ThemeContext';

type IconName = keyof typeof Ionicons.glyphMap;

const MODES: { mode: ThemeMode; label: string; icon: IconName }[] = [
  { mode: 'system', label: 'System', icon: 'phone-portrait-outline' },
  { mode: 'light', label: 'Light', icon: 'sunny-outline' },
  { mode: 'dark', label: 'Dark', icon: 'moon-outline' },
];

export default function MoreScreen() {
  const { colors, mode, setMode } = useTheme();
  const { user, logout, updateProfile } = useAuth();
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout(); // clears the secure token; the route guard then shows the login screen
    } finally {
      setLoggingOut(false);
    }
  };

  const setPreference = async (key: keyof NotificationPreferences, value: boolean) => {
    try {
      await updateProfile({ preferences: { [key]: value } });
    } catch (e) {
      Alert.alert('Could not save preference', getErrorMessage(e));
    }
  };

  const links: { label: string; icon: IconName; onPress: () => void }[] = [
    { label: 'My profile', icon: 'person-circle-outline', onPress: () => router.push('/profile') },
    { label: 'Site visits', icon: 'calendar-outline', onPress: () => router.push('/visits') },
    { label: 'Notifications', icon: 'notifications-outline', onPress: () => router.push('/notifications') },
    { label: 'Change password', icon: 'lock-closed-outline', onPress: () => router.push('/change-password') },
  ];

  const prefs: { key: keyof NotificationPreferences; label: string; hint: string }[] = [
    { key: 'followUps', label: 'Follow-up reminders', hint: 'Due and overdue follow-ups' },
    { key: 'siteVisits', label: 'Site visit alerts', hint: 'Upcoming and changed visits' },
    { key: 'newLeads', label: 'New lead alerts', hint: 'When a new lead is added or received' },
  ];

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      <ScreenHeader title="More" />
      <ScrollView contentContainerStyle={styles.content}>
        <Card style={styles.profile}>
          <Avatar name={user?.name ?? '?'} uri={user?.avatarUrl} size={56} />
          <View style={styles.profileText}>
            <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
              {user?.name}
            </Text>
            <Text style={[styles.meta, { color: colors.textMuted }]} numberOfLines={1}>
              {user?.email}
            </Text>
            <Text style={[styles.meta, { color: colors.textMuted }]} numberOfLines={1}>
              {user?.role}
            </Text>
          </View>
        </Card>

        <Card style={styles.list}>
          {links.map((l, i) => (
            <Pressable
              key={l.label}
              accessibilityRole="button"
              onPress={l.onPress}
              style={({ pressed }) => [
                styles.row,
                i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
                pressed && { opacity: 0.7 },
              ]}
            >
              <Ionicons name={l.icon} size={20} color={colors.primary} style={styles.rowIcon} />
              <Text style={[styles.rowLabel, { color: colors.text }]}>{l.label}</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </Pressable>
          ))}
        </Card>

        <Text style={[styles.section, { color: colors.text }]}>Notification preferences</Text>
        <Card style={styles.list}>
          {prefs.map((p, i) => (
            <View key={p.key} style={[styles.row, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}>
              <View style={styles.prefText}>
                <Text style={[styles.rowLabel, { color: colors.text }]}>{p.label}</Text>
                <Text style={[styles.meta, { color: colors.textMuted }]}>{p.hint}</Text>
              </View>
              <Switch
                value={user?.preferences?.[p.key] ?? true}
                onValueChange={(v) => setPreference(p.key, v)}
                trackColor={{ true: colors.primary }}
                accessibilityLabel={p.label}
              />
            </View>
          ))}
        </Card>

        <Text style={[styles.section, { color: colors.text }]}>Appearance</Text>
        <View style={styles.modes}>
          {MODES.map((m) => {
            const active = mode === m.mode;
            return (
              <Pressable
                key={m.mode}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => setMode(m.mode)}
                style={[
                  styles.mode,
                  { backgroundColor: active ? colors.primarySoft : colors.surface, borderColor: active ? colors.primary : colors.border },
                ]}
              >
                <Ionicons name={m.icon} size={20} color={active ? colors.primary : colors.textMuted} />
                <Text style={{ color: active ? colors.primary : colors.textMuted, fontWeight: '600', fontSize: fontSize.sm, marginTop: 4 }}>
                  {m.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Button title="Log out" variant="danger" icon="log-out-outline" onPress={() => setConfirmOpen(true)} style={styles.logout} />
      </ScrollView>

      <ConfirmDialog
        visible={confirmOpen}
        title="Log out?"
        message="You'll need to sign in again to access your CRM."
        confirmLabel="Log out"
        destructive
        loading={loggingOut}
        onConfirm={handleLogout}
        onCancel={() => setConfirmOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl * 2 },
  profile: { flexDirection: 'row', alignItems: 'center' },
  profileText: { flex: 1, marginLeft: spacing.lg },
  name: { fontSize: fontSize.lg, fontWeight: '700' },
  meta: { fontSize: fontSize.sm, marginTop: 2 },
  list: { marginTop: spacing.lg, paddingVertical: 0 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.lg },
  prefText: { flex: 1, marginRight: spacing.md },
  rowIcon: { marginRight: spacing.md },
  rowLabel: { flex: 1, fontSize: fontSize.md, fontWeight: '600' },
  section: { fontSize: fontSize.lg, fontWeight: '700', marginTop: spacing.xl, marginBottom: spacing.md },
  modes: { flexDirection: 'row', gap: spacing.md },
  mode: { flex: 1, alignItems: 'center', paddingVertical: spacing.md, borderRadius: radius.md, borderWidth: 1 },
  logout: { marginTop: spacing.xxl },
});

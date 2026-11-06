import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  Badge,
  Banner,
  Button,
  Card,
  ConfirmDialog,
  DateTimeField,
  ErrorState,
  FollowUpForm,
  Input,
  Loader,
  ScreenHeader,
  followUpTypeIcon,
  isOverdueFollowUp,
} from '@/components';
import { FOLLOWUP_STATUS_COLORS } from '@/constants';
import { fontSize, radius, spacing } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import { useFetch } from '@/hooks/useFetch';
import { followUpService, getErrorMessage } from '@/services';
import type { FollowUpHistoryAction } from '@/types';
import { callNumber, openWhatsApp } from '@/utils/contact';
import { formatDateTime, formatSmartDateTime, timeAgo } from '@/utils/format';

const HISTORY_ICONS: Record<FollowUpHistoryAction, keyof typeof Ionicons.glyphMap> = {
  Scheduled: 'alarm-outline',
  Updated: 'create-outline',
  Rescheduled: 'refresh-outline',
  Completed: 'checkmark-done-outline',
  Missed: 'close-circle-outline',
};

/** `/followup/new` (optionally with `leadId` + `leadName`) is the schedule form; any other id is the detail screen. */
export default function FollowUpRoute() {
  const { id, leadId, leadName } = useLocalSearchParams<{ id: string; leadId?: string; leadName?: string }>();
  const router = useRouter();

  if (id === 'new') {
    return (
      <FollowUpForm
        initialLead={leadId ? { id: leadId, name: leadName ?? 'Selected lead' } : undefined}
        onSaved={(f) => router.replace({ pathname: '/followup/[id]', params: { id: f.id } })}
      />
    );
  }
  return <FollowUpDetail id={id} />;
}

type Panel = 'complete' | 'reschedule' | null;

function FollowUpDetail({ id }: { id: string }) {
  const { colors } = useTheme();
  const router = useRouter();
  const { data: followUp, loading, refreshing, error, reload, refresh, silentReload } = useFetch(() => followUpService.get(id));

  const [editing, setEditing] = useState(false);
  const [panel, setPanel] = useState<Panel>(null);
  const [note, setNote] = useState('');
  const [newTime, setNewTime] = useState<Date | undefined>();
  const [timeError, setTimeError] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    },
    [],
  );

  const flash = (message: string) => {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2500);
  };

  if (loading) {
    return (
      <View style={[styles.flex, { backgroundColor: colors.background }]}>
        <ScreenHeader title="Follow-up" back />
        <Loader inline message="Loading follow-up…" />
      </View>
    );
  }
  if (!followUp) {
    return (
      <View style={[styles.flex, { backgroundColor: colors.background }]}>
        <ScreenHeader title="Follow-up" back />
        <ErrorState message={error ?? undefined} onRetry={reload} />
      </View>
    );
  }

  const f = followUp;
  const done = f.status === 'Completed';
  const overdue = isOverdueFollowUp(f);

  if (editing) {
    return (
      <FollowUpForm
        followUp={f}
        onCancel={() => setEditing(false)}
        onSaved={() => {
          setEditing(false);
          silentReload();
          flash('Follow-up updated');
        }}
      />
    );
  }

  const openPanel = (next: Panel) => {
    setNote('');
    setTimeError(undefined);
    if (next === 'reschedule') {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      d.setHours(10, 0, 0, 0);
      setNewTime(d);
    }
    setPanel(panel === next ? null : next);
  };

  const submitComplete = async () => {
    setBusy(true);
    try {
      await followUpService.complete(f.id, note.trim() || undefined);
      setPanel(null);
      await silentReload();
      flash('Follow-up marked as completed');
    } catch (e) {
      Alert.alert('Could not complete follow-up', getErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const submitReschedule = async () => {
    if (!newTime) return setTimeError('Pick a date and time');
    if (newTime.getTime() < Date.now() - 60_000) return setTimeError('Pick a date and time in the future');
    setTimeError(undefined);
    setBusy(true);
    try {
      await followUpService.reschedule(f.id, newTime.toISOString(), note.trim() || undefined);
      setPanel(null);
      await silentReload();
      flash('Follow-up rescheduled');
    } catch (e) {
      Alert.alert('Could not reschedule', getErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const doDelete = async () => {
    setDeleting(true);
    try {
      await followUpService.remove(f.id);
      setConfirmDelete(false);
      router.back();
    } catch (e) {
      setDeleting(false);
      setConfirmDelete(false);
      Alert.alert('Could not delete follow-up', getErrorMessage(e));
    }
  };

  const headerActions = (
    <View style={styles.headerActions}>
      <Pressable accessibilityRole="button" accessibilityLabel="Edit follow-up" hitSlop={8} style={styles.headerBtn} onPress={() => setEditing(true)}>
        <Ionicons name="create-outline" size={22} color={colors.primary} />
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Delete follow-up" hitSlop={8} style={styles.headerBtn} onPress={() => setConfirmDelete(true)}>
        <Ionicons name="trash-outline" size={22} color={colors.danger} />
      </Pressable>
    </View>
  );

  // Newest history entry first.
  const history = [...f.history].reverse();

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      <ScreenHeader title="Follow-up" subtitle={f.leadName} back right={headerActions} />
      <KeyboardAvoidingView style={styles.flex} behavior="padding">
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} colors={[colors.primary]} />}
        >
          {toast ? <Banner tone="success" message={toast} /> : null}
          {error ? <Banner tone="error" message={`Could not refresh: ${error}`} /> : null}
          {overdue && !done ? <Banner tone="error" message="This follow-up is overdue. Complete it or reschedule it." /> : null}

          <Card>
            <View style={styles.topRow}>
              <View style={[styles.typeIcon, { backgroundColor: colors.primarySoft }]}>
                <Ionicons name={followUpTypeIcon(f.type)} size={24} color={colors.primary} />
              </View>
              <View style={styles.flex}>
                <Text style={[styles.type, { color: colors.text }]}>{f.type} follow-up</Text>
                <Text style={{ color: overdue && !done ? colors.danger : colors.textMuted, fontSize: fontSize.md, marginTop: 2, fontWeight: '500' }}>
                  {formatSmartDateTime(f.scheduledAt)}
                </Text>
              </View>
              <Badge label={f.status} color={FOLLOWUP_STATUS_COLORS[f.status]} />
            </View>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Open lead ${f.leadName}`}
              onPress={() => router.push({ pathname: '/lead/[id]', params: { id: f.leadId } })}
              style={styles.leadRow}
            >
              <Ionicons name="person-outline" size={18} color={colors.textMuted} />
              <Text style={[styles.leadName, { color: colors.primary }]}>{f.leadName}</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </Pressable>

            {f.remarks ? (
              <Text style={[styles.remarks, { color: colors.text }]}>{f.remarks}</Text>
            ) : (
              <Text style={[styles.remarks, { color: colors.textMuted }]}>No remarks added.</Text>
            )}
            {done && f.completedAt ? <Text style={{ color: colors.success, fontSize: fontSize.sm, marginTop: spacing.sm }}>Completed {formatDateTime(f.completedAt)}</Text> : null}
          </Card>

          {/* Contact the customer with the channel this follow-up is about */}
          <View style={styles.actions}>
            <Button title="Call" icon="call" small variant={f.type === 'Call' ? 'primary' : 'outline'} onPress={() => callNumber(f.leadMobile)} style={styles.action} />
            <Button
              title="WhatsApp"
              icon="logo-whatsapp"
              small
              variant={f.type === 'WhatsApp' ? 'primary' : 'outline'}
              onPress={() => openWhatsApp(f.leadMobile)}
              style={styles.action}
            />
          </View>

          {!done ? (
            <View style={styles.actions}>
              <Button title="Complete" icon="checkmark-circle-outline" variant={panel === 'complete' ? 'secondary' : 'primary'} onPress={() => openPanel('complete')} style={styles.action} />
              <Button title="Reschedule" icon="refresh-outline" variant={panel === 'reschedule' ? 'secondary' : 'outline'} onPress={() => openPanel('reschedule')} style={styles.action} />
            </View>
          ) : (
            <View style={styles.actions}>
              <Button title="Reschedule" icon="refresh-outline" variant={panel === 'reschedule' ? 'secondary' : 'outline'} onPress={() => openPanel('reschedule')} style={styles.action} />
            </View>
          )}

          {panel === 'complete' ? (
            <Card style={styles.panel}>
              <Input label="Outcome note (optional)" placeholder="What was discussed?" multiline maxLength={300} value={note} onChangeText={setNote} />
              <Button title="Mark as completed" icon="checkmark" onPress={submitComplete} loading={busy} />
            </Card>
          ) : null}

          {panel === 'reschedule' ? (
            <Card style={styles.panel}>
              <DateTimeField label="New date & time" value={newTime} onChange={setNewTime} minimumDate={new Date()} error={timeError} />
              <Input label="Reason (optional)" placeholder="e.g. Customer asked to call after 6 PM" multiline maxLength={300} value={note} onChangeText={setNote} />
              <Button title="Reschedule follow-up" icon="refresh" onPress={submitReschedule} loading={busy} />
            </Card>
          ) : null}

          <Text style={[styles.section, { color: colors.text }]}>History</Text>
          <Card style={styles.history}>
            {history.map((h, i) => (
              <View key={h.id} style={[styles.histRow, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}>
                <View style={[styles.histIcon, { backgroundColor: colors.primarySoft }]}>
                  <Ionicons name={HISTORY_ICONS[h.action]} size={16} color={colors.primary} />
                </View>
                <View style={styles.flex}>
                  <Text style={[styles.histTitle, { color: colors.text }]}>{h.action}</Text>
                  {h.note ? <Text style={{ color: colors.textMuted, fontSize: fontSize.sm, marginTop: 2, lineHeight: 18 }}>{h.note}</Text> : null}
                </View>
                <Text style={{ color: colors.textMuted, fontSize: fontSize.xs + 1, marginLeft: spacing.sm }}>{timeAgo(h.at)}</Text>
              </View>
            ))}
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>

      <ConfirmDialog
        visible={confirmDelete}
        title="Delete this follow-up?"
        message="The follow-up and its history will be permanently removed."
        confirmLabel="Delete"
        destructive
        loading={deleting}
        onConfirm={doDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl * 2 },
  headerActions: { flexDirection: 'row', alignItems: 'center' },
  headerBtn: { marginLeft: spacing.lg },
  topRow: { flexDirection: 'row', alignItems: 'center' },
  typeIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md },
  type: { fontSize: fontSize.lg, fontWeight: '700' },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: spacing.md },
  leadRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.xs },
  leadName: { flex: 1, fontSize: fontSize.md, fontWeight: '700', marginLeft: spacing.sm },
  remarks: { fontSize: fontSize.md, lineHeight: 21, marginTop: spacing.md },
  actions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md },
  action: { flex: 1 },
  panel: { marginTop: spacing.md },
  section: { fontSize: fontSize.lg, fontWeight: '700', marginTop: spacing.xl, marginBottom: spacing.md },
  history: { paddingVertical: spacing.xs, paddingHorizontal: spacing.md },
  histRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: spacing.md },
  histIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md },
  histTitle: { fontSize: fontSize.md - 1, fontWeight: '600' },
});
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Badge, Banner, Button, Card, ConfirmDialog, DateTimeField, ErrorState, Input, Loader, ScreenHeader, VisitForm } from '@/components';
import { VISIT_STATUS_COLORS } from '@/constants';
import { fontSize, spacing } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import { useFetch } from '@/hooks/useFetch';
import { getErrorMessage, siteVisitService } from '@/services';
import type { SiteVisitUpdate } from '@/types';
import { callNumber, openWhatsApp } from '@/utils/contact';
import { formatDateTime, formatSmartDateTime } from '@/utils/format';

/** `/visit/new` (optionally with lead / property params) is the schedule form; any other id is the detail screen. */
export default function VisitRoute() {
  const { id, leadId, leadName, propertyId, propertyName } = useLocalSearchParams<{
    id: string;
    leadId?: string;
    leadName?: string;
    propertyId?: string;
    propertyName?: string;
  }>();
  const router = useRouter();

  if (id === 'new') {
    return (
      <VisitForm
        initialLead={leadId ? { id: leadId, name: leadName ?? 'Selected lead' } : undefined}
        initialProperty={propertyId ? { id: propertyId, name: propertyName ?? 'Selected property' } : undefined}
        onSaved={(v) => router.replace({ pathname: '/visit/[id]', params: { id: v.id } })}
      />
    );
  }
  return <VisitDetail id={id} />;
}

type Panel = 'complete' | 'reschedule' | 'notes' | null;

function VisitDetail({ id }: { id: string }) {
  const { colors } = useTheme();
  const router = useRouter();
  const { data: visit, loading, refreshing, error, reload, refresh, silentReload } = useFetch(() => siteVisitService.get(id));

  const [panel, setPanel] = useState<Panel>(null);
  const [feedback, setFeedback] = useState('');
  const [remarks, setRemarks] = useState('');
  const [newTime, setNewTime] = useState<Date | undefined>();
  const [timeError, setTimeError] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<'cancel' | 'delete' | null>(null);
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
        <ScreenHeader title="Site visit" back />
        <Loader inline message="Loading site visit…" />
      </View>
    );
  }
  if (!visit) {
    return (
      <View style={[styles.flex, { backgroundColor: colors.background }]}>
        <ScreenHeader title="Site visit" back />
        <ErrorState message={error ?? undefined} onRetry={reload} />
      </View>
    );
  }

  const v = visit;
  const open = v.status === 'Scheduled' || v.status === 'Rescheduled';

  const openPanel = (next: Panel) => {
    if (panel === next) return setPanel(null);
    setTimeError(undefined);
    setFeedback(v.feedback ?? '');
    setRemarks(v.remarks ?? '');
    if (next === 'reschedule') {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      d.setHours(11, 0, 0, 0);
      setNewTime(d);
    }
    setPanel(next);
  };

  const update = async (changes: SiteVisitUpdate, success: string) => {
    setBusy(true);
    try {
      await siteVisitService.update(v.id, changes);
      setPanel(null);
      await silentReload();
      flash(success);
      return true;
    } catch (e) {
      Alert.alert('Could not update visit', getErrorMessage(e));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const submitReschedule = () => {
    if (!newTime) return setTimeError('Pick a date and time');
    if (newTime.getTime() < Date.now() - 60_000) return setTimeError('Pick a date and time in the future');
    setTimeError(undefined);
    update({ scheduledAt: newTime.toISOString(), status: 'Rescheduled', remarks: remarks.trim() || v.remarks }, 'Visit rescheduled');
  };

  const doConfirm = async () => {
    if (confirm === 'cancel') {
      setBusy(true);
      await update({ status: 'Cancelled' }, 'Visit cancelled');
      setBusy(false);
      setConfirm(null);
    } else if (confirm === 'delete') {
      setBusy(true);
      try {
        await siteVisitService.remove(v.id);
        setConfirm(null);
        router.back();
      } catch (e) {
        setBusy(false);
        setConfirm(null);
        Alert.alert('Could not delete visit', getErrorMessage(e));
      }
    }
  };

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      <ScreenHeader
        title="Site visit"
        subtitle={v.propertyTitle}
        back
        right={
          <Pressable accessibilityRole="button" accessibilityLabel="Delete visit" hitSlop={8} onPress={() => setConfirm('delete')}>
            <Ionicons name="trash-outline" size={22} color={colors.danger} />
          </Pressable>
        }
      />
      <KeyboardAvoidingView style={styles.flex} behavior="padding">
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} colors={[colors.primary]} />}
        >
          {toast ? <Banner tone="success" message={toast} /> : null}
          {error ? <Banner tone="error" message={`Could not refresh: ${error}`} /> : null}

          <Card>
            <View style={styles.topRow}>
              <View style={[styles.bigIcon, { backgroundColor: colors.primarySoft }]}>
                <Ionicons name="calendar-outline" size={24} color={colors.primary} />
              </View>
              <View style={styles.flex}>
                <Text style={[styles.when, { color: colors.text }]}>{formatSmartDateTime(v.scheduledAt)}</Text>
                <Text style={{ color: colors.textMuted, fontSize: fontSize.sm, marginTop: 2 }}>Updated {formatDateTime(v.updatedAt)}</Text>
              </View>
              <Badge label={v.status} color={VISIT_STATUS_COLORS[v.status]} />
            </View>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            <Link
              icon="person-outline"
              text={v.leadName}
              onPress={() => router.push({ pathname: '/lead/[id]', params: { id: v.leadId } })}
              label={`Open lead ${v.leadName}`}
            />
            <Link
              icon="business-outline"
              text={`${v.propertyTitle}${v.propertyLocation ? ` · ${v.propertyLocation}` : ''}`}
              onPress={() => router.push({ pathname: '/property/[id]', params: { id: v.propertyId } })}
              label={`Open property ${v.propertyTitle}`}
            />

            <Text style={[styles.label, { color: colors.textMuted }]}>Remarks</Text>
            <Text style={[styles.body, { color: v.remarks ? colors.text : colors.textMuted }]}>{v.remarks || 'No remarks added.'}</Text>
            <Text style={[styles.label, { color: colors.textMuted }]}>Visit feedback</Text>
            <Text style={[styles.body, { color: v.feedback ? colors.text : colors.textMuted }]}>{v.feedback || 'No feedback recorded yet.'}</Text>
          </Card>

          <View style={styles.actions}>
            <Button title="Call" icon="call" small variant="outline" onPress={() => callNumber(v.leadMobile)} style={styles.action} />
            <Button title="WhatsApp" icon="logo-whatsapp" small variant="outline" onPress={() => openWhatsApp(v.leadMobile)} style={styles.action} />
          </View>

          {open ? (
            <View style={styles.actions}>
              <Button title="Complete" icon="checkmark-circle-outline" variant={panel === 'complete' ? 'secondary' : 'primary'} onPress={() => openPanel('complete')} style={styles.action} />
              <Button title="Reschedule" icon="refresh-outline" variant={panel === 'reschedule' ? 'secondary' : 'outline'} onPress={() => openPanel('reschedule')} style={styles.action} />
            </View>
          ) : (
            <View style={styles.actions}>
              <Button title="Reschedule" icon="refresh-outline" variant={panel === 'reschedule' ? 'secondary' : 'outline'} onPress={() => openPanel('reschedule')} style={styles.action} />
            </View>
          )}
          <View style={styles.actions}>
            <Button title="Edit notes" icon="create-outline" variant="ghost" onPress={() => openPanel('notes')} style={styles.action} />
            {open ? <Button title="Cancel visit" icon="close-circle-outline" variant="ghost" onPress={() => setConfirm('cancel')} style={styles.action} /> : null}
          </View>

          {panel === 'complete' ? (
            <Card style={styles.panel}>
              <Input label="Visit feedback" placeholder="How did the customer react? Any objections or next steps?" multiline maxLength={500} value={feedback} onChangeText={setFeedback} />
              <Button title="Mark visit as completed" icon="checkmark" loading={busy} onPress={() => update({ status: 'Completed', feedback: feedback.trim() }, 'Visit marked as completed')} />
            </Card>
          ) : null}

          {panel === 'reschedule' ? (
            <Card style={styles.panel}>
              <DateTimeField label="New date & time" value={newTime} onChange={setNewTime} minimumDate={new Date()} error={timeError} />
              <Input label="Remarks" placeholder="Reason for the change" multiline maxLength={500} value={remarks} onChangeText={setRemarks} />
              <Button title="Reschedule visit" icon="refresh" loading={busy} onPress={submitReschedule} />
            </Card>
          ) : null}

          {panel === 'notes' ? (
            <Card style={styles.panel}>
              <Input label="Remarks" multiline maxLength={500} value={remarks} onChangeText={setRemarks} />
              <Input label="Visit feedback" multiline maxLength={500} value={feedback} onChangeText={setFeedback} />
              <Button title="Save notes" icon="checkmark" loading={busy} onPress={() => update({ remarks: remarks.trim(), feedback: feedback.trim() }, 'Notes saved')} />
            </Card>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>

      <ConfirmDialog
        visible={confirm !== null}
        title={confirm === 'delete' ? 'Delete this visit?' : 'Cancel this visit?'}
        message={confirm === 'delete' ? 'The site visit record will be permanently removed.' : `The visit with ${v.leadName} will be marked as cancelled. You can reschedule it later.`}
        confirmLabel={confirm === 'delete' ? 'Delete' : 'Cancel visit'}
        cancelLabel={confirm === 'delete' ? 'Keep' : 'Go back'}
        destructive
        loading={busy}
        onConfirm={doConfirm}
        onCancel={() => setConfirm(null)}
      />
    </View>
  );
}

function Link({ icon, text, onPress, label }: { icon: keyof typeof Ionicons.glyphMap; text: string; onPress: () => void; label: string }) {
  const { colors } = useTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={styles.linkRow}>
      <Ionicons name={icon} size={18} color={colors.textMuted} />
      <Text style={[styles.linkText, { color: colors.primary }]} numberOfLines={2}>
        {text}
      </Text>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl * 2 },
  topRow: { flexDirection: 'row', alignItems: 'center' },
  bigIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md },
  when: { fontSize: fontSize.lg, fontWeight: '700' },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: spacing.md },
  linkRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm },
  linkText: { flex: 1, fontSize: fontSize.md, fontWeight: '700', marginHorizontal: spacing.sm },
  label: { fontSize: fontSize.xs + 1, fontWeight: '700', textTransform: 'uppercase', marginTop: spacing.lg, marginBottom: spacing.xs },
  body: { fontSize: fontSize.md, lineHeight: 21 },
  actions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md },
  action: { flex: 1 },
  panel: { marginTop: spacing.md },
});
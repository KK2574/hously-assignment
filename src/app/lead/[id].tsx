import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import {
  Avatar,
  Badge,
  Banner,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  FollowUpCard,
  Loader,
  OptionChips,
  ScreenHeader,
  VisitCard,
} from '@/components';
import { LeadForm } from '@/components/LeadForm';
import { LEAD_STAGES, PRIORITY_COLORS, STAGE_COLORS } from '@/constants';
import { fontSize, radius, spacing } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import { useFetch } from '@/hooks/useFetch';
import { followUpService, getErrorMessage, leadService, siteVisitService } from '@/services';
import type { Lead, LeadStage } from '@/types';
import { ACTIVITY_ICONS } from '@/utils/activity';
import { callNumber, copyText, openWhatsApp, sendEmail } from '@/utils/contact';
import { formatDate, formatDateTime, timeAgo } from '@/utils/format';

/** `/lead/new` is the create form; any other id is the detail screen. */
export default function LeadRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  if (id === 'new') {
    return <LeadForm onSaved={(lead) => router.replace({ pathname: '/lead/[id]', params: { id: lead.id } })} />;
  }
  return <LeadDetail id={id} />;
}

function LeadDetail({ id }: { id: string }) {
  const { colors } = useTheme();
  const router = useRouter();
  const { data, loading, refreshing, error, reload, refresh, silentReload } = useFetch(() =>
    Promise.all([
      leadService.get(id),
      leadService.activities(id),
      // Nice-to-have: a failure here must not hide the lead itself.
      followUpService.list({ leadId: id }).catch(() => []),
      siteVisitService.list({ leadId: id }).catch(() => []),
    ]),
  );

  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [stageBusy, setStageBusy] = useState(false);
  const [note, setNote] = useState('');
  const [noteBusy, setNoteBusy] = useState(false);
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
    toastTimer.current = setTimeout(() => setToast(null), 2200);
  };

  if (loading) {
    return (
      <View style={[styles.flex, { backgroundColor: colors.background }]}>
        <ScreenHeader title="Lead" back />
        <Loader inline message="Loading lead…" />
      </View>
    );
  }

  if (!data) {
    return (
      <View style={[styles.flex, { backgroundColor: colors.background }]}>
        <ScreenHeader title="Lead" back />
        <ErrorState message={error ?? undefined} onRetry={reload} />
      </View>
    );
  }

  const [lead, activities, followUps, visits] = data;

  if (editing) {
    return (
      <LeadForm
        lead={lead}
        onCancel={() => setEditing(false)}
        onSaved={() => {
          setEditing(false);
          silentReload();
          flash('Lead updated');
        }}
      />
    );
  }

  const changeStage = async (stage: LeadStage | undefined) => {
    if (!stage || stage === lead.stage || stageBusy) return;
    setStageBusy(true);
    try {
      await leadService.updateStage(lead.id, stage);
      await silentReload();
      flash(`Stage changed to ${stage}`);
    } catch (e) {
      Alert.alert('Could not change stage', getErrorMessage(e));
    } finally {
      setStageBusy(false);
    }
  };

  const submitNote = async () => {
    const text = note.trim();
    if (!text || noteBusy) return;
    setNoteBusy(true);
    try {
      await leadService.addNote(lead.id, text);
      setNote('');
      await silentReload();
    } catch (e) {
      Alert.alert('Could not add note', getErrorMessage(e));
    } finally {
      setNoteBusy(false);
    }
  };

  const doDelete = async () => {
    setDeleting(true);
    try {
      await leadService.remove(lead.id);
      setConfirmDelete(false);
      router.back();
    } catch (e) {
      setDeleting(false);
      setConfirmDelete(false);
      Alert.alert('Could not delete lead', getErrorMessage(e));
    }
  };

  const copy = async (text: string, label: string) => {
    if (await copyText(text, label)) flash(`${label} copied`);
  };

  const headerActions = (
    <View style={styles.headerActions}>
      <Pressable accessibilityRole="button" accessibilityLabel="Edit lead" hitSlop={8} style={styles.headerBtn} onPress={() => setEditing(true)}>
        <Ionicons name="create-outline" size={22} color={colors.primary} />
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Delete lead" hitSlop={8} style={styles.headerBtn} onPress={() => setConfirmDelete(true)}>
        <Ionicons name="trash-outline" size={22} color={colors.danger} />
      </Pressable>
    </View>
  );

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      <ScreenHeader title={lead.name} subtitle={`Lead · added ${formatDate(lead.createdAt)}`} back right={headerActions} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} colors={[colors.primary]} />}
        >
          {toast ? <Banner tone="success" message={toast} /> : null}
          {error ? <Banner tone="error" message={`Could not refresh: ${error}`} /> : null}

          {/* Summary */}
          <Card>
            <View style={styles.summaryTop}>
              <Avatar name={lead.name} size={56} />
              <View style={styles.summaryText}>
                <Text style={[styles.name, { color: colors.text }]} numberOfLines={2}>
                  {lead.name}
                </Text>
                <View style={styles.badges}>
                  <Badge label={lead.stage} color={STAGE_COLORS[lead.stage]} />
                  <Badge label={`${lead.priority} priority`} color={PRIORITY_COLORS[lead.priority]} />
                </View>
              </View>
            </View>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <InfoRow label="Source" value={lead.source} />
            <InfoRow label="Assigned to" value={lead.assignedTo} />
            <InfoRow label="Last updated" value={formatDateTime(lead.updatedAt)} />
            {lead.remarks ? <InfoRow label="Remarks" value={lead.remarks} multiline /> : null}
          </Card>

          {/* Contact */}
          <Text style={[styles.section, { color: colors.text }]}>Contact</Text>
          <Card>
            <ContactRow icon="call-outline" label="Mobile" value={lead.mobile} onCopy={() => copy(lead.mobile, 'Mobile number')} />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <ContactRow icon="mail-outline" label="Email" value={lead.email || 'Not provided'} muted={!lead.email} onCopy={lead.email ? () => copy(lead.email, 'Email') : undefined} />
            <View style={styles.actions}>
              <Button title="Call" icon="call" small onPress={() => callNumber(lead.mobile)} style={styles.action} />
              <Button title="WhatsApp" icon="logo-whatsapp" small variant="secondary" onPress={() => openWhatsApp(lead.mobile, `Hi ${lead.name.split(' ')[0]}, this is regarding your property enquiry with Hously.`)} style={styles.action} />
              <Button title="Email" icon="mail" small variant="outline" onPress={() => sendEmail(lead.email, 'Your property enquiry – Hously')} style={styles.action} />
            </View>
          </Card>

          {/* Stage */}
          <Text style={[styles.section, { color: colors.text }]}>Stage</Text>
          <OptionChips wrap options={LEAD_STAGES} value={lead.stage} onChange={changeStage} colorFor={(s) => STAGE_COLORS[s]} />
          {stageBusy ? <Text style={[styles.hint, { color: colors.textMuted }]}>Updating stage…</Text> : null}

          {/* Follow-ups */}
          <View style={styles.sectionRow}>
            <Text style={[styles.sectionInline, { color: colors.text }]}>Follow-ups</Text>
            <Button
              title="Schedule"
              icon="alarm-outline"
              small
              variant="secondary"
              onPress={() => router.push({ pathname: '/followup/[id]', params: { id: 'new', leadId: lead.id, leadName: lead.name } })}
            />
          </View>
          {followUps.length === 0 ? (
            <Card>
              <Text style={{ color: colors.textMuted, fontSize: fontSize.sm }}>No follow-ups scheduled for this lead yet.</Text>
            </Card>
          ) : (
            followUps.map((f) => (
              <FollowUpCard key={f.id} followUp={f} onPress={() => router.push({ pathname: '/followup/[id]', params: { id: f.id } })} />
            ))
          )}

          {/* Site visits */}
          <View style={styles.sectionRow}>
            <Text style={[styles.sectionInline, { color: colors.text }]}>Site visits</Text>
            <Button
              title="Schedule"
              icon="calendar-outline"
              small
              variant="secondary"
              onPress={() => router.push({ pathname: '/visit/[id]', params: { id: 'new', leadId: lead.id, leadName: lead.name } })}
            />
          </View>
          {visits.length === 0 ? (
            <Card>
              <Text style={{ color: colors.textMuted, fontSize: fontSize.sm }}>No site visits scheduled for this lead yet.</Text>
            </Card>
          ) : (
            visits.map((v) => <VisitCard key={v.id} visit={v} onPress={() => router.push({ pathname: '/visit/[id]', params: { id: v.id } })} />)
          )}

          {/* Activity */}
          <Text style={[styles.section, { color: colors.text }]}>Activity history</Text>
          <Card style={styles.noteCard}>
            <TextInput
              style={[styles.noteInput, { color: colors.text, backgroundColor: colors.surfaceAlt }]}
              value={note}
              onChangeText={setNote}
              placeholder="Add a note about this lead…"
              placeholderTextColor={colors.textMuted}
              multiline
              maxLength={300}
              accessibilityLabel="Add a note"
            />
            <Button title="Add note" icon="add" small onPress={submitNote} loading={noteBusy} disabled={!note.trim()} style={styles.noteBtn} />
          </Card>

          <Card style={styles.feed}>
            {activities.length === 0 ? (
              <EmptyState icon="time-outline" title="No activity yet" message="Stage changes, notes, follow-ups and visits will appear here." />
            ) : (
              activities.map((a, i) => (
                <View key={a.id} style={[styles.feedRow, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}>
                  <View style={[styles.feedIcon, { backgroundColor: colors.primarySoft }]}>
                    <Ionicons name={ACTIVITY_ICONS[a.kind] ?? 'ellipse-outline'} size={16} color={colors.primary} />
                  </View>
                  <View style={styles.feedText}>
                    <Text style={[styles.feedTitle, { color: colors.text }]}>{a.title}</Text>
                    {a.description ? <Text style={[styles.feedDesc, { color: colors.textMuted }]}>{a.description}</Text> : null}
                  </View>
                  <Text style={[styles.feedTime, { color: colors.textMuted }]}>{timeAgo(a.createdAt)}</Text>
                </View>
              ))
            )}
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>

      <ConfirmDialog
        visible={confirmDelete}
        title="Delete this lead?"
        message={`${lead.name} and all of their follow-ups, site visits and activity history will be permanently removed.`}
        confirmLabel="Delete"
        destructive
        loading={deleting}
        onConfirm={doDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </View>
  );
}

function InfoRow({ label, value, multiline }: { label: string; value: string; multiline?: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.infoRow, multiline && styles.infoRowTop]}>
      <Text style={[styles.infoLabel, { color: colors.textMuted }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

function ContactRow({
  icon,
  label,
  value,
  muted,
  onCopy,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  muted?: boolean;
  onCopy?: () => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.contactRow}>
      <Ionicons name={icon} size={20} color={colors.primary} style={styles.contactIcon} />
      <View style={styles.flex}>
        <Text style={[styles.infoLabel, { color: colors.textMuted }]}>{label}</Text>
        <Text style={[styles.contactValue, { color: muted ? colors.textMuted : colors.text }]} selectable>
          {value}
        </Text>
      </View>
      {onCopy ? (
        <Pressable accessibilityRole="button" accessibilityLabel={`Copy ${label.toLowerCase()}`} hitSlop={10} onPress={onCopy}>
          <Ionicons name="copy-outline" size={20} color={colors.textMuted} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl * 2 },
  headerActions: { flexDirection: 'row', alignItems: 'center' },
  headerBtn: { marginLeft: spacing.lg },
  summaryTop: { flexDirection: 'row', alignItems: 'center' },
  summaryText: { flex: 1, marginLeft: spacing.lg },
  name: { fontSize: fontSize.lg, fontWeight: '700', marginBottom: spacing.sm },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: spacing.md },
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.xs + 2 },
  infoRowTop: { alignItems: 'flex-start' },
  infoLabel: { fontSize: fontSize.sm, width: 110 },
  infoValue: { flex: 1, fontSize: fontSize.md, fontWeight: '500' },
  section: { fontSize: fontSize.lg, fontWeight: '700', marginTop: spacing.xl, marginBottom: spacing.md },
  contactRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.xs },
  contactIcon: { marginRight: spacing.md },
  contactValue: { fontSize: fontSize.md, fontWeight: '600', marginTop: 2 },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  action: { flex: 1 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.xl, marginBottom: spacing.md },
  sectionInline: { fontSize: fontSize.lg, fontWeight: '700' },
  hint: { fontSize: fontSize.sm, marginTop: spacing.sm },
  noteCard: { padding: spacing.md },
  noteInput: { minHeight: 64, borderRadius: radius.md, padding: spacing.md, fontSize: fontSize.md, textAlignVertical: 'top' },
  noteBtn: { alignSelf: 'flex-end', marginTop: spacing.sm },
  feed: { marginTop: spacing.md, paddingVertical: spacing.xs, paddingHorizontal: spacing.md },
  feedRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: spacing.md },
  feedIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md },
  feedText: { flex: 1 },
  feedTitle: { fontSize: fontSize.md - 1, fontWeight: '600' },
  feedDesc: { fontSize: fontSize.sm, marginTop: 2, lineHeight: 18 },
  feedTime: { fontSize: fontSize.xs + 1, marginLeft: spacing.sm },
});

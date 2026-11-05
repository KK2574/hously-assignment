import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { FOLLOWUP_STATUS_COLORS, FOLLOWUP_TYPE_ICONS } from '@/constants';
import { fontSize, radius, spacing } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import type { FollowUp } from '@/types';
import { formatSmartDateTime } from '@/utils/format';

import { Badge } from './Badge';
import { Card } from './Card';

export const followUpTypeIcon = (type: FollowUp['type']) => FOLLOWUP_TYPE_ICONS[type] as keyof typeof Ionicons.glyphMap;

/** A pending follow-up whose time has passed (or one already marked missed). */
export const isOverdueFollowUp = (f: FollowUp) => f.status === 'Missed' || (f.status === 'Pending' && new Date(f.scheduledAt).getTime() < Date.now());

interface Props {
  followUp: FollowUp;
  onPress: () => void;
  /** Shows a quick "mark done" button on pending items. */
  onComplete?: () => void;
}

export function FollowUpCard({ followUp: f, onPress, onComplete }: Props) {
  const { colors } = useTheme();
  const overdue = isOverdueFollowUp(f);
  const statusColor = FOLLOWUP_STATUS_COLORS[f.status];

  return (
    <Card onPress={onPress} style={styles.card}>
      <View style={styles.row}>
        <View style={[styles.icon, { backgroundColor: colors.primarySoft }]}>
          <Ionicons name={followUpTypeIcon(f.type)} size={20} color={colors.primary} />
        </View>
        <View style={styles.text}>
          <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
            {f.leadName}
          </Text>
          <Text style={[styles.when, { color: overdue && f.status !== 'Completed' ? colors.danger : colors.textMuted }]} numberOfLines={1}>
            {f.type} · {formatSmartDateTime(f.scheduledAt)}
          </Text>
        </View>
        <Badge label={f.status} color={statusColor} />
      </View>
      {f.remarks ? (
        <Text style={[styles.remarks, { color: colors.textMuted }]} numberOfLines={2}>
          {f.remarks}
        </Text>
      ) : null}
      {onComplete && f.status !== 'Completed' ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Mark follow-up with ${f.leadName} as completed`}
          onPress={onComplete}
          style={[styles.done, { backgroundColor: colors.successSoft }]}
        >
          <Ionicons name="checkmark-circle-outline" size={18} color={colors.success} />
          <Text style={{ color: colors.success, fontWeight: '700', fontSize: fontSize.sm, marginLeft: 6 }}>Mark as done</Text>
        </Pressable>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: spacing.md, padding: spacing.md + 2 },
  row: { flexDirection: 'row', alignItems: 'center' },
  icon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md },
  text: { flex: 1, marginRight: spacing.sm },
  name: { fontSize: fontSize.md, fontWeight: '700' },
  when: { fontSize: fontSize.sm, marginTop: 2, fontWeight: '500' },
  remarks: { fontSize: fontSize.sm, marginTop: spacing.md, lineHeight: 18 },
  done: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, paddingVertical: spacing.sm + 2, marginTop: spacing.md },
});

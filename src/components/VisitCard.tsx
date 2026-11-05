import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { VISIT_STATUS_COLORS } from '@/constants';
import { fontSize, spacing } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import type { SiteVisit } from '@/types';
import { formatSmartDateTime } from '@/utils/format';

import { Badge } from './Badge';
import { Card } from './Card';

export function VisitCard({ visit: v, onPress }: { visit: SiteVisit; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Card onPress={onPress} style={styles.card}>
      <View style={styles.row}>
        <View style={[styles.icon, { backgroundColor: colors.primarySoft }]}>
          <Ionicons name="calendar-outline" size={20} color={colors.primary} />
        </View>
        <View style={styles.text}>
          <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
            {v.leadName}
          </Text>
          <Text style={[styles.meta, { color: colors.textMuted }]} numberOfLines={1}>
            {formatSmartDateTime(v.scheduledAt)}
          </Text>
        </View>
        <Badge label={v.status} color={VISIT_STATUS_COLORS[v.status]} />
      </View>
      <View style={styles.propRow}>
        <Ionicons name="business-outline" size={14} color={colors.textMuted} />
        <Text style={[styles.meta, { color: colors.textMuted, flex: 1 }]} numberOfLines={1}>
          {' '}
          {v.propertyTitle}
          {v.propertyLocation ? ` · ${v.propertyLocation}` : ''}
        </Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: spacing.md, padding: spacing.md + 2 },
  row: { flexDirection: 'row', alignItems: 'center' },
  icon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md },
  text: { flex: 1, marginRight: spacing.sm },
  name: { fontSize: fontSize.md, fontWeight: '700' },
  meta: { fontSize: fontSize.sm, marginTop: 2 },
  propRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.md },
});

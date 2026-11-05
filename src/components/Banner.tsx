import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { fontSize, radius, spacing } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';

interface Props {
  message: string;
  tone?: 'error' | 'success' | 'info';
}

/** Inline message for form-level errors / confirmations. */
export function Banner({ message, tone = 'info' }: Props) {
  const { colors } = useTheme();
  const t = {
    error: { bg: colors.dangerSoft, fg: colors.danger, icon: 'alert-circle-outline' as const },
    success: { bg: colors.successSoft, fg: colors.success, icon: 'checkmark-circle-outline' as const },
    info: { bg: colors.primarySoft, fg: colors.primary, icon: 'information-circle-outline' as const },
  }[tone];

  return (
    <View style={[styles.wrap, { backgroundColor: t.bg }]} accessibilityRole={tone === 'error' ? 'alert' : undefined}>
      <Ionicons name={t.icon} size={18} color={t.fg} style={styles.icon} />
      <Text style={[styles.text, { color: t.fg }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'flex-start', padding: spacing.md, borderRadius: radius.md, marginBottom: spacing.lg },
  icon: { marginRight: spacing.sm, marginTop: 1 },
  text: { flex: 1, fontSize: fontSize.sm, lineHeight: 19, fontWeight: '500' },
});

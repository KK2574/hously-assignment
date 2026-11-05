import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { fontSize, spacing } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';

interface Props {
  message?: string;
  /** Fill the whole screen (default) or just take up inline space. */
  inline?: boolean;
}

export function Loader({ message, inline }: Props) {
  const { colors } = useTheme();
  return (
    <View style={[styles.wrap, !inline && styles.full, !inline && { backgroundColor: colors.background }]}>
      <ActivityIndicator size="large" color={colors.primary} />
      {message ? <Text style={[styles.text, { color: colors.textMuted }]}>{message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  full: { flex: 1 },
  text: { marginTop: spacing.md, fontSize: fontSize.sm },
});

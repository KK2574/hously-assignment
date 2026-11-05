import React from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { fontSize, radius, spacing } from '@/constants/theme';

interface Props {
  label: string;
  /** Text / dot colour. The background is a 14% tint of it. */
  color: string;
  style?: StyleProp<ViewStyle>;
}

export function Badge({ label, color, style }: Props) {
  return (
    <View style={[styles.badge, { backgroundColor: `${color}24` }, style]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.text, { color }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  dot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  text: { fontSize: fontSize.xs + 1, fontWeight: '600' },
});

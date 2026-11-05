import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/context/ThemeContext';
import { getInitials } from '@/utils/format';

interface Props {
  name: string;
  uri?: string | null;
  size?: number;
}

export function Avatar({ name, uri, size = 40 }: Props) {
  const { colors } = useTheme();
  const box = { width: size, height: size, borderRadius: size / 2 };

  if (uri) return <Image source={{ uri }} style={[box, { backgroundColor: colors.surfaceAlt }]} accessibilityLabel={`${name} avatar`} />;

  return (
    <View style={[styles.fallback, box, { backgroundColor: colors.primarySoft }]}>
      <Text style={{ color: colors.primary, fontWeight: '700', fontSize: size * 0.38 }}>{getInitials(name)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: { alignItems: 'center', justifyContent: 'center' },
});

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fontSize, spacing } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';

interface Props {
  title: string;
  subtitle?: string;
  /** Shows a back arrow. */
  back?: boolean;
  right?: React.ReactNode;
}

export function ScreenHeader({ title, subtitle, back, right }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View
      style={[
        styles.wrap,
        { paddingTop: insets.top + spacing.sm, backgroundColor: colors.surface, borderBottomColor: colors.border },
      ]}
    >
      {back ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={10}
          style={styles.back}
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
        >
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </Pressable>
      ) : null}
      <View style={styles.titles}>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={[styles.subtitle, { color: colors.textMuted }]} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  back: { marginRight: spacing.sm, marginLeft: -spacing.xs },
  titles: { flex: 1 },
  title: { fontSize: fontSize.xl, fontWeight: '700' },
  subtitle: { fontSize: fontSize.sm, marginTop: 2 },
});

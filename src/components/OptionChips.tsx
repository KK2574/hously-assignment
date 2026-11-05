import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { fontSize, radius, spacing } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';

interface Props<T extends string> {
  options: readonly T[];
  /** The selected option, or `undefined` for "nothing / All". */
  value: T | undefined;
  onChange: (value: T | undefined) => void;
  /** Filter mode: adds an "All" chip and lets a tap on the active chip clear it. */
  allLabel?: string;
  /** Wrap onto several lines (forms) instead of scrolling sideways (filter bars). */
  wrap?: boolean;
  label?: string;
  error?: string;
  /** Optional per-option accent colour. */
  colorFor?: (option: T) => string | undefined;
}

export function OptionChips<T extends string>({ options, value, onChange, allLabel, wrap, label, error, colorFor }: Props<T>) {
  const { colors } = useTheme();

  const chip = (text: string, selected: boolean, onPress: () => void, accent?: string) => (
    <Pressable
      key={text}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: selected ? accent ?? colors.primary : colors.surface,
          borderColor: selected ? accent ?? colors.primary : colors.border,
        },
      ]}
    >
      <Text style={{ color: selected ? '#FFFFFF' : colors.text, fontSize: fontSize.sm, fontWeight: '600' }}>{text}</Text>
    </Pressable>
  );

  const chips = (
    <>
      {allLabel ? chip(allLabel, value === undefined, () => onChange(undefined)) : null}
      {options.map((o) => chip(o, value === o, () => onChange(allLabel && value === o ? undefined : o), colorFor?.(o)))}
    </>
  );

  return (
    <View style={label ? styles.field : undefined}>
      {label ? <Text style={[styles.label, { color: colors.text }]}>{label}</Text> : null}
      {wrap ? (
        <View style={styles.wrap}>{chips}</View>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
          {chips}
        </ScrollView>
      )}
      {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { marginBottom: spacing.lg },
  label: { fontSize: fontSize.sm, fontWeight: '600', marginBottom: spacing.sm },
  row: { gap: spacing.sm, paddingRight: spacing.lg },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { paddingHorizontal: spacing.md + 2, paddingVertical: spacing.sm, borderRadius: radius.pill, borderWidth: 1 },
  error: { fontSize: fontSize.xs + 1, marginTop: spacing.xs + 2 },
});

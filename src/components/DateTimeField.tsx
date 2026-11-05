import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerAndroid, type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { fontSize, radius, spacing } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';

interface Props {
  label?: string;
  value: Date | undefined;
  onChange: (date: Date) => void;
  minimumDate?: Date;
  error?: string;
  placeholder?: string;
}

const dateText = (d: Date) => d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
const timeText = (d: Date) => d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });

/** Date + time picker. Android opens the native dialogs one after another; iOS shows the compact inline pickers. */
export function DateTimeField({ label, value, onChange, minimumDate, error, placeholder = 'Select' }: Props) {
  const { colors, isDark } = useTheme();
  const current = value ?? new Date();

  const openAndroid = (mode: 'date' | 'time') => {
    DateTimePickerAndroid.open({
      value: current,
      mode,
      is24Hour: false,
      minimumDate: mode === 'date' ? minimumDate : undefined,
      onChange: (event: DateTimePickerEvent, picked?: Date) => {
        if (event.type !== 'set' || !picked) return;
        const next = new Date(current);
        if (mode === 'date') next.setFullYear(picked.getFullYear(), picked.getMonth(), picked.getDate());
        else next.setHours(picked.getHours(), picked.getMinutes(), 0, 0);
        onChange(next);
      },
    });
  };

  const borderColor = error ? colors.danger : colors.border;

  return (
    <View style={styles.wrap}>
      {label ? <Text style={[styles.label, { color: colors.text }]}>{label}</Text> : null}

      {Platform.OS === 'android' ? (
        <View style={styles.row}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${label ?? 'Date'}: choose date`}
            onPress={() => openAndroid('date')}
            style={[styles.field, styles.grow, { backgroundColor: colors.surface, borderColor }]}
          >
            <Ionicons name="calendar-outline" size={18} color={colors.textMuted} style={styles.icon} />
            <Text style={{ color: value ? colors.text : colors.textMuted, fontSize: fontSize.md }}>{value ? dateText(value) : placeholder}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${label ?? 'Time'}: choose time`}
            onPress={() => openAndroid('time')}
            style={[styles.field, styles.timeField, { backgroundColor: colors.surface, borderColor }]}
          >
            <Ionicons name="time-outline" size={18} color={colors.textMuted} style={styles.icon} />
            <Text style={{ color: value ? colors.text : colors.textMuted, fontSize: fontSize.md }}>{value ? timeText(value) : placeholder}</Text>
          </Pressable>
        </View>
      ) : (
        <View style={[styles.field, styles.iosField, { backgroundColor: colors.surface, borderColor }]}>
          <DateTimePicker
            value={current}
            mode="datetime"
            display="compact"
            minimumDate={minimumDate}
            themeVariant={isDark ? 'dark' : 'light'}
            onChange={(_, picked) => picked && onChange(picked)}
          />
          {!value ? <Text style={{ color: colors.textMuted, fontSize: fontSize.sm, marginLeft: spacing.md }}>Tap to set</Text> : null}
        </View>
      )}

      {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.lg },
  label: { fontSize: fontSize.sm, fontWeight: '600', marginBottom: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.md },
  field: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing.md, minHeight: 48 },
  iosField: { paddingVertical: spacing.xs },
  grow: { flex: 1 },
  timeField: { minWidth: 120 },
  icon: { marginRight: spacing.sm },
  error: { fontSize: fontSize.xs + 1, marginTop: spacing.xs + 2 },
});

import React from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { fontSize, radius, spacing } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';

import { Banner } from './Banner';
import { Button } from './Button';

interface Props {
  visible: boolean;
  title: string;
  confirmLabel?: string;
  loading?: boolean;
  error?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
  children: React.ReactNode;
}

/** A centred dialog that hosts a few form fields (complete / reschedule / feedback...). */
export function FormModal({ visible, title, confirmLabel = 'Save', loading, error, onConfirm, onCancel, children }: Props) {
  const { colors } = useTheme();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={loading ? undefined : onCancel}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={[styles.backdrop, { backgroundColor: colors.overlay }]} onPress={loading ? undefined : onCancel}>
          <Pressable style={[styles.card, { backgroundColor: colors.surface }]} onPress={() => undefined}>
            <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
            <ScrollView keyboardShouldPersistTaps="handled" style={styles.body}>
              {error ? <Banner tone="error" message={error} /> : null}
              {children}
            </ScrollView>
            <View style={styles.actions}>
              <Button title="Cancel" variant="outline" onPress={onCancel} disabled={loading} style={styles.btn} />
              <Button title={confirmLabel} onPress={onConfirm} loading={loading} style={styles.btn} />
            </View>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  card: { width: '100%', maxWidth: 440, maxHeight: '85%', borderRadius: radius.lg, padding: spacing.xl },
  title: { fontSize: fontSize.lg, fontWeight: '700', marginBottom: spacing.lg },
  body: { flexGrow: 0 },
  actions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm },
  btn: { flex: 1 },
});

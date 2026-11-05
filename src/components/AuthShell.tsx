import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fontSize, radius, spacing } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';

interface Props {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

/** Common frame for the login / register / forgot-password screens. */
export function AuthShell({ title, subtitle, children, footer }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <KeyboardAvoidingView style={[styles.flex, { backgroundColor: colors.background }]} behavior="padding">
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.xl }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.brand}>
          <View style={[styles.logo, { backgroundColor: colors.primary }]}>
            <Ionicons name="business" size={26} color="#FFFFFF" />
          </View>
          <View>
            <Text style={[styles.brandName, { color: colors.text }]}>Hously</Text>
            <Text style={[styles.brandSub, { color: colors.textMuted }]}>Finntech Realty CRM</Text>
          </View>
        </View>

        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        {subtitle ? <Text style={[styles.subtitle, { color: colors.textMuted }]}>{subtitle}</Text> : null}

        <View style={styles.form}>{children}</View>
        {footer}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingHorizontal: spacing.xl, flexGrow: 1 },
  brand: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xxl },
  logo: { width: 48, height: 48, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md },
  brandName: { fontSize: fontSize.xl, fontWeight: '800' },
  brandSub: { fontSize: fontSize.sm },
  title: { fontSize: 26, fontWeight: '800' },
  subtitle: { fontSize: fontSize.md, marginTop: spacing.xs + 2, lineHeight: 21 },
  form: { marginTop: spacing.xl },
});

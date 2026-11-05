import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'expo-router';
import React, { useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { AuthShell, Banner, Button, Input } from '@/components';
import { fontSize, spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { getErrorMessage } from '@/services';
import { DEMO_EMAIL, DEMO_PASSWORD } from '@/services/mock/seed';
import { USE_MOCK } from '@/services/config';
import { loginSchema, type LoginForm } from '@/utils/validators';

export default function LoginScreen() {
  const { colors } = useTheme();
  const { login } = useAuth();
  const passwordRef = useRef<React.ComponentRef<typeof TextInput>>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = handleSubmit(async ({ email, password }) => {
    setServerError(null);
    try {
      await login(email, password);
      // The route guard in the root layout moves us to the tabs once the user is set.
    } catch (e) {
      setServerError(getErrorMessage(e, 'Could not sign in. Please try again.'));
    }
  });

  const fillDemo = () => {
    setValue('email', DEMO_EMAIL, { shouldValidate: true });
    setValue('password', DEMO_PASSWORD, { shouldValidate: true });
  };

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to manage your properties, leads and follow-ups."
      footer={
        <View style={styles.footer}>
          <Text style={{ color: colors.textMuted, fontSize: fontSize.md }}>Don't have an account? </Text>
          <Link href="/register" style={{ color: colors.primary, fontSize: fontSize.md, fontWeight: '700' }}>
            Register
          </Link>
        </View>
      }
    >
      {serverError ? <Banner tone="error" message={serverError} /> : null}

      <Controller
        control={control}
        name="email"
        render={({ field: { value, onChange, onBlur } }) => (
          <Input
            label="Email"
            icon="mail-outline"
            placeholder="you@company.com"
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            returnKeyType="next"
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            onSubmitEditing={() => passwordRef.current?.focus()}
            error={errors.email?.message}
          />
        )}
      />

      <Controller
        control={control}
        name="password"
        render={({ field: { value, onChange, onBlur } }) => (
          <Input
            ref={passwordRef}
            label="Password"
            icon="lock-closed-outline"
            placeholder="Your password"
            password
            autoCapitalize="none"
            autoComplete="password"
            returnKeyType="done"
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            onSubmitEditing={() => onSubmit()}
            error={errors.password?.message}
          />
        )}
      />

      <Link href="/forgot-password" asChild>
        <Pressable style={styles.forgot} hitSlop={8}>
          <Text style={{ color: colors.primary, fontWeight: '600', fontSize: fontSize.sm }}>Forgot password?</Text>
        </Pressable>
      </Link>

      <Button title="Sign in" onPress={() => onSubmit()} loading={isSubmitting} />

      {USE_MOCK ? (
        <Button title="Use demo account" variant="secondary" icon="flash-outline" onPress={fillDemo} style={styles.demo} />
      ) : null}
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  forgot: { alignSelf: 'flex-end', marginTop: -spacing.sm, marginBottom: spacing.xl },
  demo: { marginTop: spacing.md },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: spacing.xl },
});

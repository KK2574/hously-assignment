import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'expo-router';
import React, { useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { AuthShell, Banner, Button, Input } from '@/components';
import { fontSize, spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { getErrorMessage } from '@/services';
import { registerSchema, type RegisterForm } from '@/utils/validators';

export default function RegisterScreen() {
  const { colors } = useTheme();
  const { register } = useAuth();
  const [serverError, setServerError] = useState<string | null>(null);

  const emailRef = useRef<React.ComponentRef<typeof TextInput>>(null);
  const phoneRef = useRef<React.ComponentRef<typeof TextInput>>(null);
  const passwordRef = useRef<React.ComponentRef<typeof TextInput>>(null);
  const confirmRef = useRef<React.ComponentRef<typeof TextInput>>(null);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', email: '', phone: '', password: '', confirmPassword: '' },
  });

  const onSubmit = handleSubmit(async ({ name, email, phone, password }) => {
    setServerError(null);
    try {
      await register({ name, email, phone, password });
    } catch (e) {
      setServerError(getErrorMessage(e, 'Could not create your account. Please try again.'));
    }
  });

  return (
    <AuthShell
      title="Create account"
      subtitle="Register to start managing your real-estate pipeline."
      footer={
        <View style={styles.footer}>
          <Text style={{ color: colors.textMuted, fontSize: fontSize.md }}>Already have an account? </Text>
          <Link href="/login" style={{ color: colors.primary, fontSize: fontSize.md, fontWeight: '700' }}>
            Sign in
          </Link>
        </View>
      }
    >
      {serverError ? <Banner tone="error" message={serverError} /> : null}

      <Controller
        control={control}
        name="name"
        render={({ field: { value, onChange, onBlur } }) => (
          <Input
            label="Full name"
            icon="person-outline"
            placeholder="Aarav Mehta"
            autoCapitalize="words"
            autoComplete="name"
            returnKeyType="next"
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            onSubmitEditing={() => emailRef.current?.focus()}
            error={errors.name?.message}
          />
        )}
      />

      <Controller
        control={control}
        name="email"
        render={({ field: { value, onChange, onBlur } }) => (
          <Input
            ref={emailRef}
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
            onSubmitEditing={() => phoneRef.current?.focus()}
            error={errors.email?.message}
          />
        )}
      />

      <Controller
        control={control}
        name="phone"
        render={({ field: { value, onChange, onBlur } }) => (
          <Input
            ref={phoneRef}
            label="Mobile number"
            icon="call-outline"
            placeholder="9876543210"
            keyboardType="phone-pad"
            autoComplete="tel"
            maxLength={14}
            returnKeyType="next"
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            onSubmitEditing={() => passwordRef.current?.focus()}
            error={errors.phone?.message}
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
            placeholder="At least 6 characters"
            password
            autoCapitalize="none"
            returnKeyType="next"
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            onSubmitEditing={() => confirmRef.current?.focus()}
            error={errors.password?.message}
          />
        )}
      />

      <Controller
        control={control}
        name="confirmPassword"
        render={({ field: { value, onChange, onBlur } }) => (
          <Input
            ref={confirmRef}
            label="Confirm password"
            icon="lock-closed-outline"
            placeholder="Re-enter your password"
            password
            autoCapitalize="none"
            returnKeyType="done"
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            onSubmitEditing={() => onSubmit()}
            error={errors.confirmPassword?.message}
          />
        )}
      />

      <Button title="Create account" onPress={() => onSubmit()} loading={isSubmitting} style={styles.submit} />
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  submit: { marginTop: spacing.sm },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: spacing.xl },
});

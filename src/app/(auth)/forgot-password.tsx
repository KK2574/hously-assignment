import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Alert, StyleSheet, TextInput } from 'react-native';

import { AuthShell, Banner, Button, Input } from '@/components';
import { spacing } from '@/constants/theme';
import { authService, getErrorMessage } from '@/services';
import {
  forgotPasswordSchema,
  resetPasswordSchema,
  type ForgotPasswordForm,
  type ResetPasswordForm,
} from '@/utils/validators';

type Step = 'request' | 'reset';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('request');
  const [email, setEmail] = useState('');
  const [info, setInfo] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const goToLogin = () => (router.canGoBack() ? router.back() : router.replace('/login'));

  return (
    <AuthShell
      title={step === 'request' ? 'Forgot password?' : 'Set a new password'}
      subtitle={
        step === 'request'
          ? "Enter your account email and we'll send you a 6-digit reset code."
          : `Enter the code sent to ${email} and choose a new password.`
      }
    >
      {serverError ? <Banner tone="error" message={serverError} /> : null}
      {info ? <Banner tone="info" message={info} /> : null}

      {step === 'request' ? (
        <RequestStep
          onSent={(sentTo, message) => {
            setEmail(sentTo);
            setInfo(message);
            setServerError(null);
            setStep('reset');
          }}
          onError={setServerError}
        />
      ) : (
        <ResetStep
          email={email}
          onDone={() => {
            setServerError(null);
            setInfo(null);
            Alert.alert('Password updated', 'You can now sign in with your new password.');
            goToLogin();
          }}
          onError={setServerError}
        />
      )}

      <Button
        title={step === 'request' ? 'Back to sign in' : 'Use a different email'}
        variant="ghost"
        onPress={step === 'request' ? goToLogin : () => { setStep('request'); setInfo(null); setServerError(null); }}
        style={styles.secondary}
      />
    </AuthShell>
  );
}

function RequestStep({ onSent, onError }: { onSent: (email: string, message: string) => void; onError: (m: string | null) => void }) {
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordForm>({ resolver: zodResolver(forgotPasswordSchema), defaultValues: { email: '' } });

  const onSubmit = handleSubmit(async ({ email }) => {
    onError(null);
    try {
      const res = await authService.forgotPassword(email);
      // devHint only exists on the mock API, so reviewers can finish the flow without a mail server.
      onSent(email.trim(), [res.message, res.devHint].filter(Boolean).join(' '));
    } catch (e) {
      onError(getErrorMessage(e, 'Could not send the reset code. Please try again.'));
    }
  });

  return (
    <>
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
            returnKeyType="send"
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            onSubmitEditing={() => onSubmit()}
            error={errors.email?.message}
          />
        )}
      />
      <Button title="Send reset code" onPress={() => onSubmit()} loading={isSubmitting} />
    </>
  );
}

function ResetStep({ email, onDone, onError }: { email: string; onDone: () => void; onError: (m: string | null) => void }) {
  const passwordRef = useRef<React.ComponentRef<typeof TextInput>>(null);
  const confirmRef = useRef<React.ComponentRef<typeof TextInput>>(null);
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordForm>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { otp: '', newPassword: '', confirmPassword: '' },
  });

  const onSubmit = handleSubmit(async ({ otp, newPassword }) => {
    onError(null);
    try {
      await authService.resetPassword(email, otp, newPassword);
      onDone();
    } catch (e) {
      onError(getErrorMessage(e, 'Could not reset your password. Please try again.'));
    }
  });

  return (
    <>
      <Controller
        control={control}
        name="otp"
        render={({ field: { value, onChange, onBlur } }) => (
          <Input
            label="Reset code"
            icon="key-outline"
            placeholder="6-digit code"
            keyboardType="number-pad"
            maxLength={6}
            returnKeyType="next"
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            onSubmitEditing={() => passwordRef.current?.focus()}
            error={errors.otp?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="newPassword"
        render={({ field: { value, onChange, onBlur } }) => (
          <Input
            ref={passwordRef}
            label="New password"
            icon="lock-closed-outline"
            placeholder="At least 6 characters"
            password
            autoCapitalize="none"
            returnKeyType="next"
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            onSubmitEditing={() => confirmRef.current?.focus()}
            error={errors.newPassword?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="confirmPassword"
        render={({ field: { value, onChange, onBlur } }) => (
          <Input
            ref={confirmRef}
            label="Confirm new password"
            icon="lock-closed-outline"
            placeholder="Re-enter the new password"
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
      <Button title="Reset password" onPress={() => onSubmit()} loading={isSubmitting} />
    </>
  );
}

const styles = StyleSheet.create({
  secondary: { marginTop: spacing.md },
});

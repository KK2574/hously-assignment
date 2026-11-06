import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Alert, KeyboardAvoidingView, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { Banner, Button, Input, ScreenHeader } from '@/components';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import { authService, getErrorMessage } from '@/services';
import { changePasswordSchema, type ChangePasswordForm } from '@/utils/validators';

export default function ChangePasswordScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const newRef = useRef<React.ComponentRef<typeof TextInput>>(null);
  const confirmRef = useRef<React.ComponentRef<typeof TextInput>>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordForm>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  const onSubmit = handleSubmit(async ({ currentPassword, newPassword }) => {
    setServerError(null);
    try {
      await authService.changePassword(currentPassword, newPassword);
      Alert.alert('Password changed', 'Your password has been updated.', [{ text: 'OK', onPress: () => router.back() }]);
    } catch (e) {
      setServerError(getErrorMessage(e, 'Could not change your password. Please try again.'));
    }
  });

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      <ScreenHeader title="Change password" back />
      <KeyboardAvoidingView style={styles.flex} behavior="padding">
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {serverError ? <Banner tone="error" message={serverError} /> : null}

          <Controller
            control={control}
            name="currentPassword"
            render={({ field: { value, onChange, onBlur } }) => (
              <Input
                label="Current password"
                icon="lock-closed-outline"
                password
                autoCapitalize="none"
                returnKeyType="next"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                onSubmitEditing={() => newRef.current?.focus()}
                error={errors.currentPassword?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="newPassword"
            render={({ field: { value, onChange, onBlur } }) => (
              <Input
                ref={newRef}
                label="New password"
                icon="key-outline"
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
                icon="key-outline"
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

          <Button title="Update password" icon="checkmark" onPress={() => onSubmit()} loading={isSubmitting} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl * 2 },
});
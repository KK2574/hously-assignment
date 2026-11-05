import { zodResolver } from '@hookform/resolvers/zod';
import * as ImagePicker from 'expo-image-picker';
import React, { useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Avatar, Banner, Button, Card, Input, ScreenHeader } from '@/components';
import { fontSize, spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { getErrorMessage } from '@/services';
import { formatDate } from '@/utils/format';
import { profileSchema, type ProfileForm } from '@/utils/validators';

export default function ProfileScreen() {
  const { colors } = useTheme();
  const { user, updateProfile } = useAuth();
  const phoneRef = useRef<React.ComponentRef<typeof TextInput>>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: user?.name ?? '', phone: user?.phone ?? '' },
  });

  if (!user) return null;

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    setSaved(false);
    try {
      const updated = await updateProfile({ name: values.name.trim(), phone: values.phone.trim() });
      reset({ name: updated.name, phone: updated.phone });
      setSaved(true);
    } catch (e) {
      setServerError(getErrorMessage(e, 'Could not update your profile. Please try again.'));
    }
  });

  const changePhoto = async () => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5, // compressed before it is stored / uploaded
      });
      if (res.canceled) return;
      setPhotoBusy(true);
      setServerError(null);
      await updateProfile({ avatarUrl: res.assets[0].uri });
      setSaved(true);
    } catch (e) {
      Alert.alert('Could not update photo', getErrorMessage(e, 'Allow photo access in your device settings and try again.'));
    } finally {
      setPhotoBusy(false);
    }
  };

  const removePhoto = async () => {
    setPhotoBusy(true);
    try {
      await updateProfile({ avatarUrl: null });
    } catch (e) {
      Alert.alert('Could not remove photo', getErrorMessage(e));
    } finally {
      setPhotoBusy(false);
    }
  };

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      <ScreenHeader title="My profile" back />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {saved ? <Banner tone="success" message="Profile updated." /> : null}
          {serverError ? <Banner tone="error" message={serverError} /> : null}

          <View style={styles.photoBlock}>
            <Avatar name={user.name} uri={user.avatarUrl} size={96} />
            <View style={styles.photoActions}>
              <Button title={user.avatarUrl ? 'Change photo' : 'Upload photo'} icon="camera-outline" small variant="secondary" onPress={changePhoto} loading={photoBusy} />
              {user.avatarUrl ? <Button title="Remove" small variant="ghost" onPress={removePhoto} disabled={photoBusy} /> : null}
            </View>
          </View>

          <Controller
            control={control}
            name="name"
            render={({ field: { value, onChange, onBlur } }) => (
              <Input
                label="Full name"
                icon="person-outline"
                autoCapitalize="words"
                returnKeyType="next"
                value={value}
                onChangeText={(t) => {
                  setSaved(false);
                  onChange(t);
                }}
                onBlur={onBlur}
                onSubmitEditing={() => phoneRef.current?.focus()}
                error={errors.name?.message}
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
                keyboardType="phone-pad"
                maxLength={14}
                returnKeyType="done"
                value={value}
                onChangeText={(t) => {
                  setSaved(false);
                  onChange(t);
                }}
                onBlur={onBlur}
                onSubmitEditing={() => onSubmit()}
                error={errors.phone?.message}
              />
            )}
          />

          <Card style={styles.readonly}>
            <Row label="Email" value={user.email} />
            <Row label="Role" value={user.role} />
            <Row label="Member since" value={formatDate(user.createdAt)} />
          </Card>

          <Button title="Save changes" icon="checkmark" onPress={() => onSubmit()} loading={isSubmitting} disabled={!isDirty} style={styles.save} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, { color: colors.textMuted }]}>{label}</Text>
      <Text style={[styles.rowValue, { color: colors.text }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl * 2 },
  photoBlock: { alignItems: 'center', marginBottom: spacing.xl },
  photoActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.md },
  readonly: { marginBottom: spacing.xl },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.xs + 2 },
  rowLabel: { width: 110, fontSize: fontSize.sm },
  rowValue: { flex: 1, fontSize: fontSize.md, fontWeight: '500' },
  save: {},
});

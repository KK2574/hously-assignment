import { zodResolver } from '@hookform/resolvers/zod';
import React, { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { FOLLOWUP_TYPES } from '@/constants';
import { fontSize, spacing } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import { followUpService, getErrorMessage } from '@/services';
import type { FollowUp } from '@/types';
import { followUpSchema, type FollowUpForm as FollowUpFormValues } from '@/utils/validators';

import { Banner } from './Banner';
import { Button } from './Button';
import { DateTimeField } from './DateTimeField';
import { Input } from './Input';
import { LeadPicker } from './LeadPicker';
import { OptionChips } from './OptionChips';
import { ScreenHeader } from './ScreenHeader';

interface Props {
  /** Editing an existing follow-up (the lead cannot be changed). */
  followUp?: FollowUp;
  /** Pre-selected lead when scheduling from a lead's screen. */
  initialLead?: { id: string; name: string };
  onSaved: (followUp: FollowUp) => void;
  onCancel?: () => void;
}

export function FollowUpForm({ followUp, initialLead, onSaved, onCancel }: Props) {
  const { colors } = useTheme();
  const isEdit = !!followUp;
  const [serverError, setServerError] = useState<string | null>(null);
  const [leadName, setLeadName] = useState(followUp?.leadName ?? initialLead?.name);

  // Default to the next full hour.
  const defaultWhen = () => {
    const d = new Date();
    d.setHours(d.getHours() + 1, 0, 0, 0);
    return d;
  };

  const {
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FollowUpFormValues>({
    resolver: zodResolver(followUpSchema),
    defaultValues: {
      leadId: followUp?.leadId ?? initialLead?.id ?? '',
      type: followUp?.type ?? 'Call',
      scheduledAt: followUp ? new Date(followUp.scheduledAt) : defaultWhen(),
      remarks: followUp?.remarks ?? '',
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    // New follow-ups must be in the future (a small grace period covers "now").
    const changedTime = !isEdit || values.scheduledAt.toISOString() !== new Date(followUp!.scheduledAt).toISOString();
    if (changedTime && values.scheduledAt.getTime() < Date.now() - 60_000) {
      setError('scheduledAt', { message: 'Pick a date and time in the future' });
      return;
    }
    try {
      const saved = isEdit
        ? await followUpService.update(followUp.id, { type: values.type, scheduledAt: values.scheduledAt.toISOString(), remarks: values.remarks })
        : await followUpService.create({ leadId: values.leadId, type: values.type, scheduledAt: values.scheduledAt.toISOString(), remarks: values.remarks });
      onSaved(saved);
    } catch (e) {
      setServerError(getErrorMessage(e, 'Could not save the follow-up. Please try again.'));
    }
  });

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      <ScreenHeader
        title={isEdit ? 'Edit follow-up' : 'Schedule follow-up'}
        back={!onCancel}
        right={
          onCancel ? (
            <Pressable accessibilityRole="button" hitSlop={10} onPress={onCancel}>
              <Text style={{ color: colors.primary, fontWeight: '700', fontSize: fontSize.md }}>Cancel</Text>
            </Pressable>
          ) : undefined
        }
      />
      <KeyboardAvoidingView style={styles.flex} behavior="padding">
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {serverError ? <Banner tone="error" message={serverError} /> : null}

          <Controller
            control={control}
            name="leadId"
            render={({ field: { value, onChange } }) => (
              <LeadPicker
                value={value}
                selectedName={leadName}
                disabled={isEdit}
                onChange={(lead) => {
                  setLeadName(lead.name);
                  onChange(lead.id);
                }}
                error={errors.leadId?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="type"
            render={({ field: { value, onChange } }) => (
              <OptionChips wrap label="Follow-up type" options={FOLLOWUP_TYPES} value={value} onChange={(v) => v && onChange(v)} />
            )}
          />

          <Controller
            control={control}
            name="scheduledAt"
            render={({ field: { value, onChange } }) => (
              <DateTimeField label="Date & time" value={value} onChange={onChange} minimumDate={new Date()} error={errors.scheduledAt?.message} />
            )}
          />

          <Controller
            control={control}
            name="remarks"
            render={({ field: { value, onChange, onBlur } }) => (
              <Input
                label="Remarks"
                placeholder="What should be discussed?"
                multiline
                maxLength={500}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.remarks?.message}
              />
            )}
          />

          <Button title={isEdit ? 'Save changes' : 'Schedule follow-up'} icon="alarm-outline" onPress={() => onSubmit()} loading={isSubmitting} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl * 2 },
});
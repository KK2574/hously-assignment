import { zodResolver } from '@hookform/resolvers/zod';
import React, { useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { EXECUTIVES, LEAD_PRIORITIES, LEAD_SOURCES, LEAD_STAGES, PRIORITY_COLORS, STAGE_COLORS } from '@/constants';
import { fontSize, spacing } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import { getErrorMessage, leadService } from '@/services';
import type { Lead } from '@/types';
import { leadSchema, type LeadForm as LeadFormValues } from '@/utils/validators';

import { Banner } from './Banner';
import { Button } from './Button';
import { Input } from './Input';
import { OptionChips } from './OptionChips';
import { ScreenHeader } from './ScreenHeader';

interface Props {
  /** Present when editing an existing lead. */
  lead?: Lead;
  onSaved: (lead: Lead) => void;
  /** Edit mode only: shows a Cancel action instead of the back arrow. */
  onCancel?: () => void;
}

export function LeadForm({ lead, onSaved, onCancel }: Props) {
  const { colors } = useTheme();
  const [serverError, setServerError] = useState<string | null>(null);
  const mobileRef = useRef<React.ComponentRef<typeof TextInput>>(null);
  const emailRef = useRef<React.ComponentRef<typeof TextInput>>(null);
  const isEdit = !!lead;

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LeadFormValues>({
    resolver: zodResolver(leadSchema),
    defaultValues: {
      name: lead?.name ?? '',
      mobile: lead?.mobile ?? '',
      email: lead?.email ?? '',
      source: lead?.source ?? 'Website',
      assignedTo: (lead?.assignedTo as (typeof EXECUTIVES)[number] | undefined) ?? EXECUTIVES[0],
      priority: lead?.priority ?? 'Medium',
      stage: lead?.stage ?? 'New',
      remarks: lead?.remarks ?? '',
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      const input = { ...values, mobile: values.mobile.trim(), email: values.email.trim() };
      const saved = isEdit ? await leadService.update(lead.id, input) : await leadService.create(input);
      onSaved(saved);
    } catch (e) {
      setServerError(getErrorMessage(e, 'Could not save the lead. Please try again.'));
    }
  });

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      <ScreenHeader
        title={isEdit ? 'Edit lead' : 'Add lead'}
        back={!onCancel}
        right={
          onCancel ? (
            <Pressable accessibilityRole="button" hitSlop={10} onPress={onCancel}>
              <Text style={{ color: colors.primary, fontWeight: '700', fontSize: fontSize.md }}>Cancel</Text>
            </Pressable>
          ) : undefined
        }
      />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {serverError ? <Banner tone="error" message={serverError} /> : null}

          <Controller
            control={control}
            name="name"
            render={({ field: { value, onChange, onBlur } }) => (
              <Input
                label="Customer name *"
                icon="person-outline"
                placeholder="e.g. Rohit Sharma"
                autoCapitalize="words"
                returnKeyType="next"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                onSubmitEditing={() => mobileRef.current?.focus()}
                error={errors.name?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="mobile"
            render={({ field: { value, onChange, onBlur } }) => (
              <Input
                ref={mobileRef}
                label="Mobile *"
                icon="call-outline"
                placeholder="9876543210"
                keyboardType="phone-pad"
                maxLength={14}
                returnKeyType="next"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                onSubmitEditing={() => emailRef.current?.focus()}
                error={errors.mobile?.message}
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
                placeholder="customer@example.com (optional)"
                keyboardType="email-address"
                autoCapitalize="none"
                returnKeyType="done"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.email?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="source"
            render={({ field: { value, onChange } }) => (
              <OptionChips wrap label="Lead source" options={LEAD_SOURCES} value={value} onChange={(v) => v && onChange(v)} error={errors.source?.message} />
            )}
          />
          <Controller
            control={control}
            name="assignedTo"
            render={({ field: { value, onChange } }) => (
              <OptionChips wrap label="Assigned executive" options={EXECUTIVES} value={value} onChange={(v) => v && onChange(v)} error={errors.assignedTo?.message} />
            )}
          />
          <Controller
            control={control}
            name="priority"
            render={({ field: { value, onChange } }) => (
              <OptionChips
                wrap
                label="Priority"
                options={LEAD_PRIORITIES}
                value={value}
                onChange={(v) => v && onChange(v)}
                colorFor={(p) => PRIORITY_COLORS[p]}
                error={errors.priority?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="stage"
            render={({ field: { value, onChange } }) => (
              <OptionChips
                wrap
                label="Stage"
                options={LEAD_STAGES}
                value={value}
                onChange={(v) => v && onChange(v)}
                colorFor={(s) => STAGE_COLORS[s]}
                error={errors.stage?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="remarks"
            render={({ field: { value, onChange, onBlur } }) => (
              <Input
                label="Remarks"
                placeholder="Budget, preferred location, anything worth remembering…"
                multiline
                maxLength={500}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.remarks?.message}
              />
            )}
          />

          <Button title={isEdit ? 'Save changes' : 'Create lead'} icon="checkmark" onPress={() => onSubmit()} loading={isSubmitting} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl * 2 },
});

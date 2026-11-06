import { zodResolver } from '@hookform/resolvers/zod';
import React, { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { KeyboardAvoidingView, ScrollView, StyleSheet, View } from 'react-native';

import { spacing } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import { getErrorMessage, siteVisitService } from '@/services';
import type { SiteVisit } from '@/types';
import { siteVisitSchema, type SiteVisitForm as SiteVisitFormValues } from '@/utils/validators';

import { Banner } from './Banner';
import { Button } from './Button';
import { DateTimeField } from './DateTimeField';
import { Input } from './Input';
import { LeadPicker } from './LeadPicker';
import { PropertyPicker } from './PropertyPicker';
import { ScreenHeader } from './ScreenHeader';

interface Props {
  initialLead?: { id: string; name: string };
  initialProperty?: { id: string; name: string };
  onSaved: (visit: SiteVisit) => void;
}

/** Schedule a new site visit. (Changing an existing visit is done with Reschedule on its details screen.) */
export function VisitForm({ initialLead, initialProperty, onSaved }: Props) {
  const { colors } = useTheme();
  const [serverError, setServerError] = useState<string | null>(null);
  const [leadName, setLeadName] = useState(initialLead?.name);
  const [propertyName, setPropertyName] = useState(initialProperty?.name);

  const {
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SiteVisitFormValues>({
    resolver: zodResolver(siteVisitSchema),
    defaultValues: {
      leadId: initialLead?.id ?? '',
      propertyId: initialProperty?.id ?? '',
      scheduledAt: (() => {
        const d = new Date();
        d.setDate(d.getDate() + 1);
        d.setHours(11, 0, 0, 0);
        return d;
      })(),
      remarks: '',
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    if (values.scheduledAt.getTime() < Date.now() - 60_000) {
      setError('scheduledAt', { message: 'Pick a date and time in the future' });
      return;
    }
    try {
      const saved = await siteVisitService.create({
        leadId: values.leadId,
        propertyId: values.propertyId,
        scheduledAt: values.scheduledAt.toISOString(),
        remarks: values.remarks,
      });
      onSaved(saved);
    } catch (e) {
      // e.g. 409 when the property already has a visit around that time
      setServerError(getErrorMessage(e, 'Could not schedule the visit. Please try again.'));
    }
  });

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      <ScreenHeader title="Schedule site visit" back />
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
            name="propertyId"
            render={({ field: { value, onChange } }) => (
              <PropertyPicker
                value={value}
                selectedName={propertyName}
                onChange={(p) => {
                  setPropertyName(p.title);
                  onChange(p.id);
                }}
                error={errors.propertyId?.message}
              />
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
                placeholder="Meeting point, parking, who will attend…"
                multiline
                maxLength={500}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.remarks?.message}
              />
            )}
          />

          <Button title="Schedule visit" icon="calendar-outline" onPress={() => onSubmit()} loading={isSubmitting} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl * 2 },
});
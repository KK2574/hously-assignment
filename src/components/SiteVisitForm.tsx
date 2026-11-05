import { zodResolver } from '@hookform/resolvers/zod';
import React, { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { spacing } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import { getErrorMessage, leadService, propertyService, siteVisitService } from '@/services';
import type { Lead, Property, SiteVisit } from '@/types';
import { formatPrice } from '@/utils/format';
import { siteVisitSchema, type SiteVisitForm as SiteVisitFormValues } from '@/utils/validators';

import { Banner } from './Banner';
import { Button } from './Button';
import { DateTimeField } from './DateTimeField';
import { EntityPicker, type PickerItem } from './EntityPicker';
import { Input } from './Input';
import { ScreenHeader } from './ScreenHeader';

interface Props {
  initialLeadId?: string;
  initialPropertyId?: string;
  onSaved: (visit: SiteVisit) => void;
}

const leadItem = (l: Lead): PickerItem => ({ id: l.id, title: l.name, subtitle: `${l.mobile} · ${l.stage}` });
const propertyItem = (p: Property): PickerItem => ({
  id: p.id,
  title: p.title,
  subtitle: `${p.location} · ${formatPrice(p.price, p.listingType)} · ${p.status}`,
});

function nextHour(): Date {
  const d = new Date();
  d.setHours(d.getHours() + 1, 0, 0, 0);
  return d;
}

export function SiteVisitForm({ initialLeadId, initialPropertyId, onSaved }: Props) {
  const { colors } = useTheme();
  const [serverError, setServerError] = useState<string | null>(null);
  const [lead, setLead] = useState<PickerItem | null>(null);
  const [property, setProperty] = useState<PickerItem | null>(null);

  const {
    control,
    handleSubmit,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SiteVisitFormValues>({
    resolver: zodResolver(siteVisitSchema),
    defaultValues: { leadId: initialLeadId ?? '', propertyId: initialPropertyId ?? '', scheduledAt: nextHour(), remarks: '' },
  });

  // Resolve display names for anything pre-selected from the calling screen.
  useEffect(() => {
    if (initialLeadId) leadService.get(initialLeadId).then((l) => setLead(leadItem(l))).catch(() => undefined);
    if (initialPropertyId) propertyService.get(initialPropertyId).then((p) => setProperty(propertyItem(p))).catch(() => undefined);
  }, [initialLeadId, initialPropertyId]);

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    if (values.scheduledAt.getTime() < Date.now() - 60_000) {
      setError('scheduledAt', { message: 'Pick a time in the future' });
      return;
    }
    try {
      const saved = await siteVisitService.create({
        leadId: values.leadId,
        propertyId: values.propertyId,
        scheduledAt: values.scheduledAt.toISOString(),
        remarks: values.remarks.trim(),
      });
      onSaved(saved);
    } catch (e) {
      setServerError(getErrorMessage(e, 'Could not schedule the visit. Please try again.'));
    }
  });

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      <ScreenHeader title="Schedule site visit" back />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {serverError ? <Banner tone="error" message={serverError} /> : null}

          <EntityPicker
            label="Lead *"
            placeholder="Select a lead"
            icon="person-outline"
            selected={lead}
            error={errors.leadId?.message}
            fetchItems={async (q) => (await leadService.list({ search: q || undefined, limit: 40 })).data.map(leadItem)}
            onSelect={(item) => {
              setLead(item);
              setValue('leadId', item.id, { shouldValidate: true });
            }}
          />
          <EntityPicker
            label="Property *"
            placeholder="Select a property"
            icon="business-outline"
            selected={property}
            error={errors.propertyId?.message}
            fetchItems={async (q) => (await propertyService.list({ search: q || undefined, limit: 40 })).data.map(propertyItem)}
            onSelect={(item) => {
              setProperty(item);
              setValue('propertyId', item.id, { shouldValidate: true });
            }}
          />

          <Controller
            control={control}
            name="scheduledAt"
            render={({ field: { value, onChange } }) => (
              <DateTimeField label="Date & time *" value={value} onChange={onChange} minimumDate={new Date()} error={errors.scheduledAt?.message} />
            )}
          />

          <Controller
            control={control}
            name="remarks"
            render={({ field: { value, onChange, onBlur } }) => (
              <Input
                label="Remarks"
                placeholder="Meeting point, special requests…"
                multiline
                maxLength={500}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.remarks?.message}
              />
            )}
          />

          <Button title="Schedule visit" icon="calendar" onPress={() => onSubmit()} loading={isSubmitting} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl * 2 },
});

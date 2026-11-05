import { Ionicons } from '@expo/vector-icons';
import { zodResolver } from '@hookform/resolvers/zod';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Alert, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import { LISTING_TYPES, PROPERTY_STATUSES, PROPERTY_TYPES } from '@/constants';
import { fontSize, radius, spacing } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import { getErrorMessage, propertyService } from '@/services';
import type { Property } from '@/types';
import { parseNumber } from '@/utils/format';
import { propertySchema, type PropertyForm as PropertyFormValues } from '@/utils/validators';

import { Banner } from './Banner';
import { Button } from './Button';
import { Input } from './Input';
import { OptionChips } from './OptionChips';
import { ScreenHeader } from './ScreenHeader';

const MAX_IMAGES = 8;
/** Property types that have a bedroom count. */
const HAS_BHK = ['Apartment', 'Villa', 'Row House'];

interface Props {
  property?: Property;
  onSaved: (property: Property) => void;
  /** Edit mode: shows Cancel instead of the back arrow. */
  onCancel?: () => void;
}

export function PropertyForm({ property, onSaved, onCancel }: Props) {
  const { colors } = useTheme();
  const isEdit = !!property;
  const [serverError, setServerError] = useState<string | null>(null);
  const [images, setImages] = useState<string[]>(property?.images ?? []);
  const [featured, setFeatured] = useState(property?.featured ?? false);

  const locationRef = useRef<React.ComponentRef<typeof TextInput>>(null);
  const priceRef = useRef<React.ComponentRef<typeof TextInput>>(null);
  const bhkRef = useRef<React.ComponentRef<typeof TextInput>>(null);
  const areaRef = useRef<React.ComponentRef<typeof TextInput>>(null);

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<PropertyFormValues>({
    resolver: zodResolver(propertySchema),
    defaultValues: {
      title: property?.title ?? '',
      type: property?.type ?? 'Apartment',
      listingType: property?.listingType ?? 'Buy',
      location: property?.location ?? '',
      price: property ? String(property.price) : '',
      bhk: property?.bhk ? String(property.bhk) : '',
      area: property ? String(property.area) : '',
      description: property?.description ?? '',
      status: property?.status ?? 'Available',
    },
  });

  const type = watch('type');
  const listingType = watch('listingType');

  // Plots / commercial have no BHK: drop any stale value so it cannot fail validation invisibly.
  useEffect(() => {
    if (!HAS_BHK.includes(type)) setValue('bhk', '');
  }, [type, setValue]);

  const pickImages = async () => {
    const room = MAX_IMAGES - images.length;
    if (room <= 0) {
      Alert.alert('Image limit reached', `You can add up to ${MAX_IMAGES} images.`);
      return;
    }
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        selectionLimit: room,
        quality: 0.6, // JPEG compression before the image is stored / uploaded
      });
      if (!res.canceled) setImages((prev) => [...prev, ...res.assets.map((a) => a.uri)].slice(0, MAX_IMAGES));
    } catch {
      Alert.alert('Could not open photos', 'Allow photo access in your device settings and try again.');
    }
  };

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      const input = {
        title: values.title.trim(),
        type: values.type,
        listingType: values.listingType,
        location: values.location.trim(),
        price: parseNumber(values.price),
        bhk: HAS_BHK.includes(values.type) && values.bhk ? Number(values.bhk) : null,
        area: parseNumber(values.area),
        description: values.description.trim(),
        status: values.status,
        images,
        featured,
      };
      const saved = isEdit ? await propertyService.update(property.id, input) : await propertyService.create(input);
      onSaved(saved);
    } catch (e) {
      setServerError(getErrorMessage(e, 'Could not save the property. Please try again.'));
    }
  });

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      <ScreenHeader
        title={isEdit ? 'Edit property' : 'Add property'}
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
            name="title"
            render={({ field: { value, onChange, onBlur } }) => (
              <Input
                label="Title *"
                icon="home-outline"
                placeholder="e.g. 3 BHK Luxury Apartment"
                returnKeyType="next"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                onSubmitEditing={() => locationRef.current?.focus()}
                error={errors.title?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="listingType"
            render={({ field: { value, onChange } }) => (
              <OptionChips wrap label="Listing" options={LISTING_TYPES} value={value} onChange={(v) => v && onChange(v)} />
            )}
          />
          <Controller
            control={control}
            name="type"
            render={({ field: { value, onChange } }) => (
              <OptionChips wrap label="Property type" options={PROPERTY_TYPES} value={value} onChange={(v) => v && onChange(v)} />
            )}
          />

          <Controller
            control={control}
            name="location"
            render={({ field: { value, onChange, onBlur } }) => (
              <Input
                ref={locationRef}
                label="Location *"
                icon="location-outline"
                placeholder="e.g. Baner, Pune"
                returnKeyType="next"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                onSubmitEditing={() => priceRef.current?.focus()}
                error={errors.location?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="price"
            render={({ field: { value, onChange, onBlur } }) => (
              <Input
                ref={priceRef}
                label={listingType === 'Rent' ? 'Monthly rent (₹) *' : 'Price (₹) *'}
                icon="cash-outline"
                placeholder={listingType === 'Rent' ? '28000' : '12500000'}
                keyboardType="number-pad"
                returnKeyType="next"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                onSubmitEditing={() => (HAS_BHK.includes(type) ? bhkRef : areaRef).current?.focus()}
                error={errors.price?.message}
              />
            )}
          />
          <View style={styles.twoCol}>
            {HAS_BHK.includes(type) ? (
              <View style={styles.col}>
                <Controller
                  control={control}
                  name="bhk"
                  render={({ field: { value, onChange, onBlur } }) => (
                    <Input
                      ref={bhkRef}
                      label="BHK"
                      icon="bed-outline"
                      placeholder="3"
                      keyboardType="number-pad"
                      maxLength={2}
                      returnKeyType="next"
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      onSubmitEditing={() => areaRef.current?.focus()}
                      error={errors.bhk?.message}
                    />
                  )}
                />
              </View>
            ) : null}
            <View style={styles.col}>
              <Controller
                control={control}
                name="area"
                render={({ field: { value, onChange, onBlur } }) => (
                  <Input
                    ref={areaRef}
                    label="Area (sq ft) *"
                    icon="resize-outline"
                    placeholder="1450"
                    keyboardType="number-pad"
                    returnKeyType="done"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={errors.area?.message}
                  />
                )}
              />
            </View>
          </View>

          <Controller
            control={control}
            name="status"
            render={({ field: { value, onChange } }) => (
              <OptionChips wrap label="Status" options={PROPERTY_STATUSES} value={value} onChange={(v) => v && onChange(v)} />
            )}
          />

          <Controller
            control={control}
            name="description"
            render={({ field: { value, onChange, onBlur } }) => (
              <Input
                label="Description"
                placeholder="Amenities, facing, nearby landmarks…"
                multiline
                maxLength={1000}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.description?.message}
              />
            )}
          />

          {/* Images */}
          <Text style={[styles.label, { color: colors.text }]}>
            Photos ({images.length}/{MAX_IMAGES})
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photoRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Add photos"
              onPress={pickImages}
              style={[styles.addPhoto, { borderColor: colors.primary, backgroundColor: colors.primarySoft }]}
            >
              <Ionicons name="camera-outline" size={24} color={colors.primary} />
              <Text style={{ color: colors.primary, fontSize: fontSize.xs + 1, fontWeight: '700', marginTop: 2 }}>Add</Text>
            </Pressable>
            {images.map((uri, i) => (
              <View key={`${uri}-${i}`} style={styles.photoWrap}>
                <Image source={{ uri }} style={[styles.photo, { backgroundColor: colors.surfaceAlt }]} />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Remove photo ${i + 1}`}
                  hitSlop={6}
                  onPress={() => setImages((prev) => prev.filter((_, idx) => idx !== i))}
                  style={styles.removePhoto}
                >
                  <Ionicons name="close" size={14} color="#FFFFFF" />
                </Pressable>
                {i === 0 ? (
                  <View style={[styles.coverTag, { backgroundColor: colors.primary }]}>
                    <Text style={styles.coverText}>Cover</Text>
                  </View>
                ) : null}
              </View>
            ))}
          </ScrollView>

          <View style={[styles.featuredRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="star" size={20} color={colors.accent} style={styles.featuredIcon} />
            <View style={styles.flex}>
              <Text style={[styles.featuredTitle, { color: colors.text }]}>Featured property</Text>
              <Text style={{ color: colors.textMuted, fontSize: fontSize.sm }}>Shown first in the property list.</Text>
            </View>
            <Switch value={featured} onValueChange={setFeatured} trackColor={{ true: colors.primary }} accessibilityLabel="Featured property" />
          </View>

          <Button title={isEdit ? 'Save changes' : 'Create property'} icon="checkmark" onPress={() => onSubmit()} loading={isSubmitting} style={styles.submit} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl * 2 },
  twoCol: { flexDirection: 'row', gap: spacing.md },
  col: { flex: 1 },
  label: { fontSize: fontSize.sm, fontWeight: '600', marginBottom: spacing.sm },
  photoRow: { gap: spacing.md, paddingBottom: spacing.lg, paddingTop: 6, paddingRight: 6 },
  addPhoto: { width: 88, height: 88, borderRadius: radius.md, borderWidth: 1.5, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  photoWrap: { width: 88, height: 88 },
  photo: { width: 88, height: 88, borderRadius: radius.md },
  removePhoto: { position: 'absolute', top: -6, right: -6, width: 22, height: 22, borderRadius: 11, backgroundColor: '#DC2626', alignItems: 'center', justifyContent: 'center' },
  coverTag: { position: 'absolute', left: 6, bottom: 6, borderRadius: radius.sm, paddingHorizontal: 6, paddingVertical: 2 },
  coverText: { color: '#FFFFFF', fontSize: 10, fontWeight: '700' },
  featuredRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: radius.md, padding: spacing.md },
  featuredIcon: { marginRight: spacing.md },
  featuredTitle: { fontSize: fontSize.md, fontWeight: '600' },
  submit: { marginTop: spacing.xl },
});

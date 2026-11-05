import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

import { Badge, Banner, Button, Card, ConfirmDialog, ErrorState, Loader, ScreenHeader } from '@/components';
import { PropertyForm } from '@/components/PropertyForm';
import { PROPERTY_STATUS_COLORS, VISIT_STATUS_COLORS } from '@/constants';
import { fontSize, radius, spacing } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import { useFetch } from '@/hooks/useFetch';
import { getErrorMessage, propertyService, siteVisitService } from '@/services';
import type { Property } from '@/types';
import { shareProperty } from '@/utils/contact';
import { formatArea, formatBhk, formatDate, formatPrice, formatSmartDateTime } from '@/utils/format';

/** `/property/new` is the create form; any other id is the detail screen. */
export default function PropertyRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  if (id === 'new') {
    return <PropertyForm onSaved={(p) => router.replace({ pathname: '/property/[id]', params: { id: p.id } })} />;
  }
  return <PropertyDetail id={id} />;
}

function PropertyDetail({ id }: { id: string }) {
  const { colors } = useTheme();
  const router = useRouter();
  const { data, loading, refreshing, error, reload, refresh, silentReload } = useFetch(() =>
    Promise.all([
      propertyService.get(id),
      // The visit list is a nice-to-have: a failure there must not hide the property itself.
      siteVisitService.list({ propertyId: id }).catch(() => []),
    ]),
  );

  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [featureBusy, setFeatureBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    },
    [],
  );

  const flash = (message: string) => {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2200);
  };

  if (loading) {
    return (
      <View style={[styles.flex, { backgroundColor: colors.background }]}>
        <ScreenHeader title="Property" back />
        <Loader inline message="Loading property…" />
      </View>
    );
  }

  if (!data) {
    return (
      <View style={[styles.flex, { backgroundColor: colors.background }]}>
        <ScreenHeader title="Property" back />
        <ErrorState message={error ?? undefined} onRetry={reload} />
      </View>
    );
  }

  const [property, visits] = data;

  if (editing) {
    return (
      <PropertyForm
        property={property}
        onCancel={() => setEditing(false)}
        onSaved={() => {
          setEditing(false);
          silentReload();
          flash('Property updated');
        }}
      />
    );
  }

  const toggleFeatured = async () => {
    if (featureBusy) return;
    setFeatureBusy(true);
    try {
      await propertyService.update(property.id, { featured: !property.featured });
      await silentReload();
      flash(property.featured ? 'Removed from featured' : 'Marked as featured');
    } catch (e) {
      Alert.alert('Could not update', getErrorMessage(e));
    } finally {
      setFeatureBusy(false);
    }
  };

  const doDelete = async () => {
    setDeleting(true);
    try {
      await propertyService.remove(property.id);
      setConfirmDelete(false);
      router.back();
    } catch (e) {
      // e.g. 409 when site visits are still scheduled for this property
      setDeleting(false);
      setConfirmDelete(false);
      Alert.alert('Could not delete property', getErrorMessage(e));
    }
  };

  const headerActions = (
    <View style={styles.headerActions}>
      <Pressable accessibilityRole="button" accessibilityLabel="Share property" hitSlop={8} style={styles.headerBtn} onPress={() => shareProperty(property)}>
        <Ionicons name="share-social-outline" size={22} color={colors.primary} />
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Edit property" hitSlop={8} style={styles.headerBtn} onPress={() => setEditing(true)}>
        <Ionicons name="create-outline" size={22} color={colors.primary} />
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Delete property" hitSlop={8} style={styles.headerBtn} onPress={() => setConfirmDelete(true)}>
        <Ionicons name="trash-outline" size={22} color={colors.danger} />
      </Pressable>
    </View>
  );

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      <ScreenHeader title="Property details" back right={headerActions} />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} colors={[colors.primary]} />}
      >
        <Gallery property={property} />

        <View style={styles.body}>
          {toast ? <Banner tone="success" message={toast} /> : null}
          {error ? <Banner tone="error" message={`Could not refresh: ${error}`} /> : null}

          <View style={styles.priceRow}>
            <Text style={[styles.price, { color: colors.text }]}>{formatPrice(property.price, property.listingType)}</Text>
            <Badge label={property.status} color={PROPERTY_STATUS_COLORS[property.status]} />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>{property.title}</Text>
          <View style={styles.locRow}>
            <Ionicons name="location-outline" size={16} color={colors.textMuted} />
            <Text style={[styles.location, { color: colors.textMuted }]}> {property.location}</Text>
          </View>

          <View style={styles.specs}>
            <Spec icon="swap-horizontal-outline" label="Listing" value={`For ${property.listingType}`} />
            <Spec icon="home-outline" label="Type" value={property.type} />
            <Spec icon="bed-outline" label="BHK" value={formatBhk(property.bhk)} />
            <Spec icon="resize-outline" label="Area" value={formatArea(property.area)} />
          </View>

          <Button
            title={property.featured ? 'Featured · tap to remove' : 'Mark as featured'}
            icon={property.featured ? 'star' : 'star-outline'}
            variant={property.featured ? 'secondary' : 'outline'}
            onPress={toggleFeatured}
            loading={featureBusy}
          />

          <Text style={[styles.section, { color: colors.text }]}>Description</Text>
          <Text style={[styles.description, { color: property.description ? colors.text : colors.textMuted }]}>
            {property.description || 'No description added.'}
          </Text>

          <View style={styles.sectionRow}>
            <Text style={[styles.sectionInline, { color: colors.text }]}>Site visits</Text>
            <Button
              title="Schedule"
              icon="calendar-outline"
              small
              variant="secondary"
              onPress={() => router.push({ pathname: '/visit/[id]', params: { id: 'new', propertyId: property.id, propertyName: property.title } })}
            />
          </View>
          <Card style={styles.visitsCard}>
            {visits.length === 0 ? (
              <Text style={{ color: colors.textMuted, fontSize: fontSize.sm }}>No site visits scheduled for this property yet.</Text>
            ) : (
              visits.map((v, i) => (
                <Pressable
                  key={v.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Open visit with ${v.leadName}`}
                  onPress={() => router.push({ pathname: '/visit/[id]', params: { id: v.id } })}
                  style={[styles.visitRow, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}
                >
                  <View style={styles.flex}>
                    <Text style={[styles.visitName, { color: colors.text }]}>{v.leadName}</Text>
                    <Text style={{ color: colors.textMuted, fontSize: fontSize.sm, marginTop: 2 }}>{formatSmartDateTime(v.scheduledAt)}</Text>
                  </View>
                  <Badge label={v.status} color={VISIT_STATUS_COLORS[v.status]} />
                </Pressable>
              ))
            )}
          </Card>

          <Text style={[styles.footnote, { color: colors.textMuted }]}>Listed {formatDate(property.createdAt)} · updated {formatDate(property.updatedAt)}</Text>
        </View>
      </ScrollView>

      <ConfirmDialog
        visible={confirmDelete}
        title="Delete this property?"
        message={`"${property.title}" will be permanently removed. This cannot be undone.`}
        confirmLabel="Delete"
        destructive
        loading={deleting}
        onConfirm={doDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </View>
  );
}

function Gallery({ property }: { property: Property }) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const [viewer, setViewer] = useState<number | null>(null);
  const height = Math.round(width * 0.68);
  const images = property.images;

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setIndex(Math.round(e.nativeEvent.contentOffset.x / width));
  };

  if (images.length === 0) {
    return (
      <View style={[styles.noImage, { height, backgroundColor: colors.surfaceAlt }]}>
        <Ionicons name="image-outline" size={48} color={colors.textMuted} />
        <Text style={{ color: colors.textMuted, marginTop: spacing.sm }}>No photos added</Text>
      </View>
    );
  }

  return (
    <View>
      <FlatList
        data={images}
        keyExtractor={(uri, i) => `${uri}-${i}`}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScroll}
        renderItem={({ item, index: i }) => (
          <Pressable accessibilityRole="imagebutton" accessibilityLabel={`Photo ${i + 1} of ${images.length}. Tap to enlarge`} onPress={() => setViewer(i)}>
            <Image source={{ uri: item }} style={{ width, height, backgroundColor: colors.surfaceAlt }} resizeMode="cover" />
          </Pressable>
        )}
      />
      {property.featured ? (
        <View style={[styles.galleryTag, { backgroundColor: colors.accent }]}>
          <Ionicons name="star" size={12} color="#0B1F44" />
          <Text style={styles.galleryTagText}> Featured</Text>
        </View>
      ) : null}
      <View style={styles.counter}>
        <Text style={styles.counterText}>
          {index + 1} / {images.length}
        </Text>
      </View>
      {images.length > 1 ? (
        <View style={styles.dots}>
          {images.map((_, i) => (
            <View key={i} style={[styles.dotItem, { backgroundColor: i === index ? '#FFFFFF' : 'rgba(255,255,255,0.5)' }]} />
          ))}
        </View>
      ) : null}

      <Modal visible={viewer !== null} transparent animationType="fade" onRequestClose={() => setViewer(null)}>
        <View style={styles.viewer}>
          {viewer !== null ? (
            <FlatList
              data={images}
              keyExtractor={(uri, i) => `${uri}-${i}`}
              horizontal
              pagingEnabled
              initialScrollIndex={viewer}
              getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
              showsHorizontalScrollIndicator={false}
              renderItem={({ item }) => (
                <View style={{ width, justifyContent: 'center' }}>
                  <Image source={{ uri: item }} style={{ width, height: width * 1.1 }} resizeMode="contain" />
                </View>
              )}
            />
          ) : null}
          <Pressable accessibilityRole="button" accessibilityLabel="Close photo viewer" style={styles.closeViewer} onPress={() => setViewer(null)} hitSlop={10}>
            <Ionicons name="close" size={28} color="#FFFFFF" />
          </Pressable>
        </View>
      </Modal>
    </View>
  );
}

function Spec({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.spec, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Ionicons name={icon} size={18} color={colors.primary} />
      <Text style={{ color: colors.textMuted, fontSize: fontSize.xs + 1, marginTop: 4 }}>{label}</Text>
      <Text style={{ color: colors.text, fontSize: fontSize.md, fontWeight: '700', marginTop: 1 }} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingBottom: spacing.xxl * 2 },
  body: { padding: spacing.lg },
  headerActions: { flexDirection: 'row', alignItems: 'center' },
  headerBtn: { marginLeft: spacing.lg },
  noImage: { alignItems: 'center', justifyContent: 'center' },
  galleryTag: { position: 'absolute', top: spacing.md, left: spacing.md, flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.sm + 2, paddingVertical: 4, borderRadius: radius.pill },
  galleryTagText: { color: '#0B1F44', fontSize: fontSize.xs + 1, fontWeight: '700' },
  counter: { position: 'absolute', top: spacing.md, right: spacing.md, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: radius.pill, paddingHorizontal: spacing.sm + 2, paddingVertical: 4 },
  counterText: { color: '#FFFFFF', fontSize: fontSize.xs + 1, fontWeight: '700' },
  dots: { position: 'absolute', bottom: spacing.md, alignSelf: 'center', flexDirection: 'row', gap: 6 },
  dotItem: { width: 7, height: 7, borderRadius: 4 },
  viewer: { flex: 1, backgroundColor: '#000000', justifyContent: 'center' },
  closeViewer: { position: 'absolute', top: 54, right: spacing.lg, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  priceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  price: { fontSize: fontSize.xxl - 4, fontWeight: '800' },
  title: { fontSize: fontSize.lg + 1, fontWeight: '700', marginTop: spacing.sm },
  locRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.xs + 2 },
  location: { fontSize: fontSize.md },
  specs: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginVertical: spacing.xl },
  spec: { width: '47.5%', flexGrow: 1, borderWidth: 1, borderRadius: radius.md, padding: spacing.md },
  section: { fontSize: fontSize.lg, fontWeight: '700', marginTop: spacing.xl, marginBottom: spacing.sm },
  description: { fontSize: fontSize.md, lineHeight: 22 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.xl, marginBottom: spacing.sm },
  sectionInline: { fontSize: fontSize.lg, fontWeight: '700' },
  visitsCard: { paddingVertical: spacing.sm },
  visitRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md },
  visitName: { fontSize: fontSize.md, fontWeight: '600' },
  footnote: { fontSize: fontSize.xs + 1, marginTop: spacing.xl, textAlign: 'center' },
});

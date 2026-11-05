import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { PROPERTY_STATUS_COLORS } from '@/constants';
import { fontSize, radius, spacing } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import type { Property } from '@/types';
import { formatArea, formatBhk, formatPrice } from '@/utils/format';

import { Badge } from './Badge';

export function PropertyCard({ property: p, onPress }: { property: Property; onPress: () => void }) {
  const { colors, isDark } = useTheme();
  const cover = p.images[0];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${p.title}, ${p.location}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border, shadowColor: colors.shadow, shadowOpacity: isDark ? 0 : 0.06 },
        pressed && { opacity: 0.9 },
      ]}
    >
      <View style={[styles.imageWrap, { backgroundColor: colors.surfaceAlt }]}>
        {cover ? (
          <Image source={{ uri: cover }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={styles.noImage}>
            <Ionicons name="image-outline" size={36} color={colors.textMuted} />
            <Text style={{ color: colors.textMuted, fontSize: fontSize.sm, marginTop: 4 }}>No photos</Text>
          </View>
        )}
        <View style={[styles.pill, styles.listingPill, { backgroundColor: p.listingType === 'Buy' ? colors.primary : '#7C3AED' }]}>
          <Text style={styles.pillText}>For {p.listingType}</Text>
        </View>
        {p.featured ? (
          <View style={[styles.pill, styles.featuredPill, { backgroundColor: colors.accent }]}>
            <Ionicons name="star" size={11} color="#0B1F44" />
            <Text style={[styles.pillText, { color: '#0B1F44', marginLeft: 3 }]}>Featured</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.body}>
        <View style={styles.priceRow}>
          <Text style={[styles.price, { color: colors.text }]}>{formatPrice(p.price, p.listingType)}</Text>
          <Badge label={p.status} color={PROPERTY_STATUS_COLORS[p.status]} />
        </View>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
          {p.title}
        </Text>
        <View style={styles.locRow}>
          <Ionicons name="location-outline" size={14} color={colors.textMuted} />
          <Text style={[styles.meta, { color: colors.textMuted }]} numberOfLines={1}>
            {' '}
            {p.location}
          </Text>
        </View>
        <Text style={[styles.meta, { color: colors.textMuted, marginTop: spacing.xs }]} numberOfLines={1}>
          {p.type}
          {p.bhk ? `  ·  ${formatBhk(p.bhk)}` : ''}  ·  {formatArea(p.area)}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.lg, borderWidth: 1, overflow: 'hidden', marginBottom: spacing.lg, shadowOffset: { width: 0, height: 2 }, shadowRadius: 8, elevation: 2 },
  imageWrap: { height: 170 },
  image: { width: '100%', height: '100%' },
  noImage: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  pill: { position: 'absolute', flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.sm + 2, paddingVertical: 4, borderRadius: radius.pill },
  listingPill: { top: spacing.md, left: spacing.md },
  featuredPill: { top: spacing.md, right: spacing.md },
  pillText: { color: '#FFFFFF', fontSize: fontSize.xs + 1, fontWeight: '700' },
  body: { padding: spacing.md + 2 },
  priceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  price: { fontSize: fontSize.lg + 1, fontWeight: '800' },
  title: { fontSize: fontSize.md, fontWeight: '600', marginTop: spacing.xs + 2 },
  locRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  meta: { fontSize: fontSize.sm },
});

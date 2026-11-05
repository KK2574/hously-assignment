import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';

import { Banner, Button, EmptyState, ErrorState, Loader, OptionChips, PropertyCard, ScreenHeader, SearchBar } from '@/components';
import { LISTING_TYPES, PROPERTY_STATUSES, PROPERTY_TYPES } from '@/constants';
import { fontSize, radius, spacing } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import { useDebounce } from '@/hooks/useDebounce';
import { usePaginatedList } from '@/hooks/usePaginatedList';
import { propertyService } from '@/services';
import type { ListingType, Property, PropertyFilters, PropertyStatus, PropertyType } from '@/types';
import { parseNumber } from '@/utils/format';

const BHK_LABELS = ['1', '2', '3', '4+'] as const;

export default function PropertiesScreen() {
  const { colors } = useTheme();
  const router = useRouter();

  const [search, setSearch] = useState('');
  const [listingType, setListingType] = useState<ListingType | undefined>();
  const [type, setType] = useState<PropertyType | undefined>();
  const [status, setStatus] = useState<PropertyStatus | undefined>();
  const [bhkLabel, setBhkLabel] = useState<(typeof BHK_LABELS)[number] | undefined>();
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const debouncedSearch = useDebounce(search.trim(), 350);
  const debouncedMin = useDebounce(minPrice, 500);
  const debouncedMax = useDebounce(maxPrice, 500);

  const min = debouncedMin ? parseNumber(debouncedMin) : NaN;
  const max = debouncedMax ? parseNumber(debouncedMax) : NaN;
  const budgetError = !Number.isNaN(min) && !Number.isNaN(max) && min > max ? 'Minimum budget is higher than the maximum.' : null;

  const filters = useMemo<PropertyFilters>(
    () => ({
      search: debouncedSearch || undefined,
      listingType,
      type,
      status,
      bhk: bhkLabel ? (bhkLabel === '4+' ? 4 : Number(bhkLabel)) : undefined,
      minPrice: Number.isFinite(min) && min > 0 ? min : undefined,
      maxPrice: Number.isFinite(max) && max > 0 ? max : undefined,
    }),
    [debouncedSearch, listingType, type, status, bhkLabel, min, max],
  );

  const activeExtra = [type, status, bhkLabel, filters.minPrice, filters.maxPrice].filter((v) => v !== undefined).length;
  const hasFilters = !!filters.search || !!listingType || activeExtra > 0;

  const list = usePaginatedList<Property>(
    (page, limit) => (budgetError ? Promise.resolve({ data: [], meta: { page: 1, limit, total: 0, totalPages: 1, hasMore: false } }) : propertyService.list({ ...filters, page, limit })),
    { deps: [filters, budgetError] },
  );

  const clearFilters = () => {
    setSearch('');
    setListingType(undefined);
    setType(undefined);
    setStatus(undefined);
    setBhkLabel(undefined);
    setMinPrice('');
    setMaxPrice('');
  };

  const openProperty = (id: string) => router.push({ pathname: '/property/[id]', params: { id } });
  const addProperty = () => router.push({ pathname: '/property/[id]', params: { id: 'new' } });

  const filterOn = showFilters || activeExtra > 0;

  const header = (
    <View style={[styles.top, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
      <View style={styles.searchRow}>
        <SearchBar value={search} onChangeText={setSearch} placeholder="Search title or location" />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Filters${activeExtra ? `, ${activeExtra} active` : ''}`}
          onPress={() => setShowFilters((v) => !v)}
          style={[styles.filterBtn, { backgroundColor: filterOn ? colors.primarySoft : colors.surface, borderColor: filterOn ? colors.primary : colors.border }]}
        >
          <Ionicons name="options-outline" size={20} color={filterOn ? colors.primary : colors.textMuted} />
          {activeExtra > 0 ? (
            <View style={[styles.dot, { backgroundColor: colors.primary }]}>
              <Text style={styles.dotText}>{activeExtra}</Text>
            </View>
          ) : null}
        </Pressable>
      </View>
      <View style={styles.chipRow}>
        <OptionChips allLabel="Buy & Rent" options={LISTING_TYPES} value={listingType} onChange={setListingType} />
      </View>
      {showFilters ? (
        <View style={styles.extra}>
          <Text style={[styles.filterLabel, { color: colors.textMuted }]}>Property type</Text>
          <OptionChips allLabel="Any" options={PROPERTY_TYPES} value={type} onChange={setType} />
          <Text style={[styles.filterLabel, { color: colors.textMuted }]}>BHK</Text>
          <OptionChips allLabel="Any" options={BHK_LABELS} value={bhkLabel} onChange={setBhkLabel} />
          <Text style={[styles.filterLabel, { color: colors.textMuted }]}>Status</Text>
          <OptionChips allLabel="Any" options={PROPERTY_STATUSES} value={status} onChange={setStatus} />
          <Text style={[styles.filterLabel, { color: colors.textMuted }]}>Budget (₹{listingType === 'Rent' ? ' per month' : ''})</Text>
          <View style={styles.budgetRow}>
            <TextInput
              style={[styles.budgetInput, { color: colors.text, borderColor: budgetError ? colors.danger : colors.border, backgroundColor: colors.surface }]}
              value={minPrice}
              onChangeText={setMinPrice}
              placeholder="Min"
              placeholderTextColor={colors.textMuted}
              keyboardType="number-pad"
              accessibilityLabel="Minimum budget"
            />
            <Text style={{ color: colors.textMuted }}>to</Text>
            <TextInput
              style={[styles.budgetInput, { color: colors.text, borderColor: budgetError ? colors.danger : colors.border, backgroundColor: colors.surface }]}
              value={maxPrice}
              onChangeText={setMaxPrice}
              placeholder="Max"
              placeholderTextColor={colors.textMuted}
              keyboardType="number-pad"
              accessibilityLabel="Maximum budget"
            />
          </View>
          {budgetError ? <Text style={{ color: colors.danger, fontSize: fontSize.sm, marginTop: spacing.xs + 2 }}>{budgetError}</Text> : null}
        </View>
      ) : null}
    </View>
  );

  let body: React.ReactNode;
  if (list.loading) {
    body = <Loader inline message="Loading properties…" />;
  } else if (list.error && list.items.length === 0) {
    body = <ErrorState message={list.error} onRetry={list.reload} />;
  } else {
    body = (
      <FlatList
        data={list.items}
        keyExtractor={(p) => p.id}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={list.refreshing} onRefresh={list.refresh} tintColor={colors.primary} colors={[colors.primary]} />}
        onEndReached={list.loadMore}
        onEndReachedThreshold={0.4}
        ListHeaderComponent={
          <>
            {list.error ? <Banner tone="error" message={list.error} /> : null}
            <Text style={[styles.count, { color: colors.textMuted }]}>
              {list.total} {list.total === 1 ? 'property' : 'properties'}
              {list.fetching ? '  · updating…' : ''}
            </Text>
          </>
        }
        ListEmptyComponent={
          hasFilters ? (
            <EmptyState icon="search-outline" title="No matching properties" message="Try a different search or clear the filters." actionLabel="Clear filters" onAction={clearFilters} />
          ) : (
            <EmptyState icon="business-outline" title="No properties yet" message="Add your first listing to get started." actionLabel="Add property" onAction={addProperty} />
          )
        }
        ListFooterComponent={
          list.loadingMore ? (
            <ActivityIndicator style={styles.footer} color={colors.primary} />
          ) : list.loadMoreError ? (
            <View style={styles.footer}>
              <Text style={{ color: colors.danger, fontSize: fontSize.sm, marginBottom: spacing.sm }}>{list.loadMoreError}</Text>
              <Button title="Retry" variant="outline" small onPress={list.loadMore} />
            </View>
          ) : undefined
        }
        renderItem={({ item }) => <PropertyCard property={item} onPress={() => openProperty(item.id)} />}
      />
    );
  }

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      <ScreenHeader title="Properties" right={<Button title="Add" icon="add" small onPress={addProperty} />} />
      {header}
      {body}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  top: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  filterBtn: { width: 44, height: 44, borderRadius: radius.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  dot: { position: 'absolute', top: -5, right: -5, minWidth: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  dotText: { color: '#FFFFFF', fontSize: 10, fontWeight: '800' },
  chipRow: { marginTop: spacing.md },
  extra: { marginTop: spacing.md },
  filterLabel: { fontSize: fontSize.xs + 1, fontWeight: '700', textTransform: 'uppercase', marginTop: spacing.sm, marginBottom: spacing.xs + 2 },
  budgetRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  budgetInput: { flex: 1, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing.md, minHeight: 44, fontSize: fontSize.md },
  listContent: { padding: spacing.lg, paddingBottom: spacing.xxl * 2, flexGrow: 1 },
  count: { fontSize: fontSize.sm, marginBottom: spacing.md },
  footer: { padding: spacing.lg, alignItems: 'center' },
});

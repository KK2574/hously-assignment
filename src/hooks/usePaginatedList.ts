import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';

import { getErrorMessage } from '@/services';
import type { Paginated } from '@/types';

interface Options {
  pageSize?: number;
  /** Reset to page 1 whenever any of these change (search text, filters...). */
  deps?: readonly unknown[];
}

/**
 * Infinite-scroll list state on top of a paginated endpoint.
 *  - first load shows `loading`; later filter changes keep the old rows on screen (`fetching`)
 *  - `loadMore` appends the next page; a failure there is reported via `loadMoreError`
 *  - screen focus silently re-fetches everything loaded so far, so edits made on another screen show up
 *  - responses from superseded requests are ignored
 */
export function usePaginatedList<T>(
  fetchPage: (page: number, limit: number) => Promise<Paginated<T>>,
  { pageSize = 20, deps = [] }: Options = {},
) {
  const [items, setItems] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);

  const fetchRef = useRef(fetchPage);
  fetchRef.current = fetchPage;
  const requestId = useRef(0);
  const hasData = useRef(false);
  const itemCount = useRef(0);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  /** Loads page 1 (with `limit` rows, so a silent refresh can cover every loaded page). */
  const loadFirst = useCallback(
    async (mode: 'initial' | 'filter' | 'refresh' | 'silent', limit = pageSize) => {
      const id = ++requestId.current;
      if (mode === 'initial') {
        setLoading(true);
        setError(null);
      } else if (mode === 'filter') setFetching(true);
      else if (mode === 'refresh') setRefreshing(true);
      try {
        const res = await fetchRef.current(1, limit);
        if (!alive.current || id !== requestId.current) return;
        hasData.current = true;
        itemCount.current = res.data.length;
        setItems(res.data);
        setTotal(res.meta.total);
        setHasMore(res.meta.hasMore);
        setPage(Math.max(Math.ceil(res.data.length / pageSize), 1));
        setError(null);
        setLoadMoreError(null);
      } catch (e) {
        if (!alive.current || id !== requestId.current) return;
        // A failed background refresh must not wipe rows that are already on screen.
        if (mode !== 'silent' && (!hasData.current || mode === 'initial')) setError(getErrorMessage(e));
        else if (mode !== 'silent') setLoadMoreError(getErrorMessage(e));
      } finally {
        if (alive.current && id === requestId.current) {
          setLoading(false);
          setFetching(false);
          setRefreshing(false);
        }
      }
    },
    [pageSize],
  );

  const loadMore = useCallback(async () => {
    if (!hasMore || loadingMore || loading || fetching) return;
    const id = requestId.current;
    setLoadingMore(true);
    setLoadMoreError(null);
    try {
      const next = page + 1;
      const res = await fetchRef.current(next, pageSize);
      if (!alive.current || id !== requestId.current) return;
      itemCount.current += res.data.length;
      setItems((prev) => [...prev, ...res.data]);
      setTotal(res.meta.total);
      setHasMore(res.meta.hasMore);
      setPage(next);
    } catch (e) {
      if (alive.current && id === requestId.current) setLoadMoreError(getErrorMessage(e));
    } finally {
      if (alive.current) setLoadingMore(false);
    }
  }, [hasMore, loadingMore, loading, fetching, page, pageSize]);

  // Filters / search changed: back to page 1 (the first run is the initial load).
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    loadFirst(hasData.current ? 'filter' : 'initial');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useFocusEffect(
    useCallback(() => {
      if (!hasData.current) loadFirst('initial');
      else loadFirst('silent', Math.min(Math.max(itemCount.current, pageSize), 100));
    }, [loadFirst, pageSize]),
  );

  return {
    items,
    total,
    hasMore,
    loading,
    fetching,
    refreshing,
    loadingMore,
    error,
    loadMoreError,
    loadMore,
    reload: useCallback(() => loadFirst('initial'), [loadFirst]),
    refresh: useCallback(() => loadFirst('refresh'), [loadFirst]),
  };
}

import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';

import { getErrorMessage } from '@/services';

interface Options {
  /** Silently re-fetch whenever the screen regains focus (default true). */
  refetchOnFocus?: boolean;
  /** Re-fetch (with the list's loading state hidden) whenever any of these change, e.g. filters. */
  deps?: readonly unknown[];
}

/**
 * Loads data for a screen and exposes the usual states:
 *  - `loading`    first load (show a Loader)
 *  - `refreshing` pull-to-refresh in progress
 *  - `error`      message of the last failed request (show ErrorState when there is no data yet)
 */
export function useFetch<T>(fetcher: () => Promise<T>, { refetchOnFocus = true, deps = [] }: Options = {}) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const hasData = useRef(false);
  const alive = useRef(true);
  const requestId = useRef(0);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const load = useCallback(async (mode: 'initial' | 'refresh' | 'silent') => {
    if (mode === 'initial') {
      setLoading(true);
      setError(null);
    }
    if (mode === 'refresh') setRefreshing(true);
    const id = ++requestId.current;
    try {
      const result = await fetcherRef.current();
      // Ignore stale responses: a slow earlier request must not overwrite a newer one.
      if (!alive.current || id !== requestId.current) return;
      hasData.current = true;
      setData(result);
      setError(null);
    } catch (e) {
      if (!alive.current || id !== requestId.current) return;
      // A failed background refresh must not wipe a screen that already has data.
      if (mode !== 'silent') setError(getErrorMessage(e));
    } finally {
      if (alive.current && id === requestId.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (!hasData.current) load('initial');
      else if (refetchOnFocus) load('silent');
    }, [load, refetchOnFocus]),
  );

  // When deps change after the first load, refetch quietly (the old rows stay visible meanwhile).
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    load('silent');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return {
    data,
    loading,
    refreshing,
    error,
    /** Retry after a failed first load. */
    reload: useCallback(() => load('initial'), [load]),
    /** For <RefreshControl onRefresh>. */
    refresh: useCallback(() => load('refresh'), [load]),
    /** Re-fetch without any spinner, e.g. after a mutation. */
    silentReload: useCallback(() => load('silent'), [load]),
  };
}

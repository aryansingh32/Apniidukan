import { useCallback, useEffect, useRef, useState } from 'react';

import { isApiError } from '@/lib/api';

interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

/**
 * Small data-fetching helper used across list/detail screens so every one
 * of them gets the same loading / error / pull-to-refresh shape without
 * re-implementing it. Re-fetches whenever `fn`'s identity changes (e.g. a
 * screen re-creating it via useCallback when a filter param changes).
 */
export function useAsync<T>(fn: () => Promise<T>) {
  const [state, setState] = useState<AsyncState<T>>({ data: null, loading: true, error: null });
  const [refreshing, setRefreshing] = useState(false);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  const load = useCallback(async (isRefresh?: boolean) => {
    if (isRefresh) setRefreshing(true);
    else setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await fnRef.current();
      setState({ data, loading: false, error: null });
    } catch (e) {
      setState((s) => ({ ...s, loading: false, error: isApiError(e) ? e.message : 'Something went wrong.' }));
    } finally {
      if (isRefresh) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fn]);

  return { ...state, refreshing, refresh: () => load(true), reload: () => load(false) };
}

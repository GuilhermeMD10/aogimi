import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Request-lifecycle helpers.
 *
 * Centralizes the AbortController dance every fetch screen used to hand-roll:
 * start a fetch, abort the in-flight one when inputs change or on unmount,
 * ignore `AbortError`. `loading` is the first-load spinner; `refreshing`
 * tracks user-driven re-fetches that should keep prior data visible.
 */

export type FetchState<T> = {
  data: T | null;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
};

export type FetchResult<T> = FetchState<T> & {
  /** User-initiated refresh. Toggles `refreshing` so a RefreshControl
   *  spinner can bind to it. */
  refresh: () => Promise<void>;
  /** Background refresh. Updates `data`/`error` on completion but never
   *  touches `loading`/`refreshing` — use for focus-triggered or
   *  interval refetches where flipping a spinner during a navigation
   *  transition causes a stuck-shown native RefreshControl. */
  silentRefresh: () => Promise<void>;
};

interface UseFetchWithAbortOptions {
  /**
   * When false, the effect does nothing and resets state to idle. Used by
   * callers that gate on a nullable input (e.g. LookupPopup's `word`).
   */
  enabled?: boolean;
}

export function useFetchWithAbort<T>(
  fetcher: (signal: AbortSignal) => Promise<T>,
  deps: React.DependencyList,
  { enabled = true }: UseFetchWithAbortOptions = {},
): FetchResult<T> {
  const [state, setState] = useState<FetchState<T>>({
    data: null,
    loading: enabled,
    refreshing: false,
    error: null,
  });

  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const controllerRef = useRef<AbortController | null>(null);
  const hasLoadedRef = useRef(false);

  const run = useCallback((mode: 'load' | 'refresh' | 'silent'): Promise<void> => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;

    if (mode === 'refresh') {
      setState((prev) => ({ ...prev, refreshing: true, error: null }));
    } else if (mode === 'load') {
      setState({ data: null, loading: true, refreshing: false, error: null });
    }
    // 'silent' leaves loading/refreshing/error untouched.

    return fetcherRef.current(controller.signal)
      .then((data) => {
        if (controller.signal.aborted) return;
        hasLoadedRef.current = true;
        setState({ data, loading: false, refreshing: false, error: null });
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        if (err instanceof Error && err.name === 'AbortError') return;
        if (mode === 'silent') {
          // Quiet failure — keep existing data + spinner state, just
          // surface the error message.
          setState((prev) => ({
            ...prev,
            error: err instanceof Error ? err.message : 'Request failed',
          }));
          return;
        }
        setState((prev) => ({
          data: mode === 'refresh' ? prev.data : null,
          loading: false,
          refreshing: false,
          error: err instanceof Error ? err.message : 'Request failed',
        }));
      });
  }, []);

  useEffect(() => {
    if (!enabled) {
      controllerRef.current?.abort();
      hasLoadedRef.current = false;
      setState({ data: null, loading: false, refreshing: false, error: null });
      return;
    }
    run('load');
    return () => controllerRef.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, ...deps]);

  const refresh = useCallback((): Promise<void> => {
    if (!enabled) return Promise.resolve();
    return run(hasLoadedRef.current ? 'refresh' : 'load');
  }, [enabled, run]);

  const silentRefresh = useCallback((): Promise<void> => {
    if (!enabled) return Promise.resolve();
    return run(hasLoadedRef.current ? 'silent' : 'load');
  }, [enabled, run]);

  return { ...state, refresh, silentRefresh };
}

/**
 * Returns a `begin()` function that yields a fresh AbortController, aborting
 * the previous one. Also aborts on unmount. Use this for *manual* triggers
 * (e.g. `useDictionarySearch.search()`), where the call site decides when
 * a request fires rather than a dep array.
 */
export function useAbortController(): () => AbortController {
  const ref = useRef<AbortController | null>(null);

  useEffect(
    () => () => {
      ref.current?.abort();
    },
    [],
  );

  return useCallback(() => {
    ref.current?.abort();
    const next = new AbortController();
    ref.current = next;
    return next;
  }, []);
}

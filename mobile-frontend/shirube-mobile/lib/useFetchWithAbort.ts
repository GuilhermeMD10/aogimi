import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Request-lifecycle helpers.
 *
 * The dictionary, reader lookup, and word-detail screens all run the same
 * AbortController dance: start a fetch, abort the in-flight one when inputs
 * change, abort on unmount, ignore `AbortError`. These hooks centralize that
 * so each caller doesn't reinvent it — and can't forget the `AbortError`
 * guard (the fix for the old LookupPopup bug).
 */

export type FetchState<T> = {
  data: T | null;
  loading: boolean;
  error: string | null;
};

interface UseFetchWithAbortOptions {
  /**
   * When false, the effect does nothing and resets state to idle. Used by
   * callers that gate on a nullable input (e.g. LookupPopup's `word`).
   */
  enabled?: boolean;
}

/**
 * Dep-driven fetch with abort. The caller supplies a fresh closure each
 * render — `deps` decides when to re-run. Matches the shape of the
 * hand-rolled `useEffect(() => { ... abort ... }, [id])` pattern it replaces.
 */
export function useFetchWithAbort<T>(
  fetcher: (signal: AbortSignal) => Promise<T>,
  deps: React.DependencyList,
  { enabled = true }: UseFetchWithAbortOptions = {},
): FetchState<T> {
  const [state, setState] = useState<FetchState<T>>({
    data: null,
    loading: enabled,
    error: null,
  });

  useEffect(() => {
    if (!enabled) {
      setState({ data: null, loading: false, error: null });
      return;
    }

    const controller = new AbortController();
    setState({ data: null, loading: true, error: null });

    fetcher(controller.signal)
      .then((data) => {
        if (controller.signal.aborted) return;
        setState({ data, loading: false, error: null });
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        if (err instanceof Error && err.name === 'AbortError') return;
        setState({
          data: null,
          loading: false,
          error: err instanceof Error ? err.message : 'Request failed',
        });
      });

    return () => controller.abort();
    // `fetcher` is intentionally excluded: callers pass a fresh closure each
    // render, and `deps` is the caller's contract for when to re-fetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, ...deps]);

  return state;
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

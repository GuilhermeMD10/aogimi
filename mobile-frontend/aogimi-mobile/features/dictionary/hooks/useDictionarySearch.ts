import { useCallback, useEffect, useState } from 'react';
import { queryDictionary, peekSearch, PAGE_SIZE } from '../lib';
import type { SearchResponse } from '../types';

/** Exported: the panes that render this state are typed against it. */
export type SearchState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'results'; response: SearchResponse; query: string }
  | { kind: 'error'; message: string };

export type DictionarySearch = {
  state: SearchState;
  /** Fetch the next page. A no-op unless `canLoadMore`. */
  loadMore: () => void;
  /** There is at least one more result than the ones on screen. */
  canLoadMore: boolean;
  /** A further page is in flight. The rows already shown stay put. */
  loadingMore: boolean;
};

/**
 * The dictionary's search state, paged.
 *
 * ── Paging is a growing limit, not an advancing offset ──────────────────────
 * `loadMore` raises the limit by `PAGE_SIZE` and re-runs the search; the reply
 * is the whole list again, longer. `localDict.PAGE_SIZE` documents why offsets
 * are wrong for this query set. It means the results array is always the
 * complete prefix of the ranking, so the list never has to stitch pages
 * together and a re-rank between pages cannot duplicate or drop a row.
 *
 * ── Two loading states, because they are different questions ────────────────
 * Page one may blank the list (`state = 'loading'`): there is nothing to keep.
 * A later page must **not** — the user is looking at twenty results and asked
 * for twenty more, so the existing rows stay and `loadingMore` drives the
 * button alone.
 *
 * ── The page resets synchronously ──────────────────────────────────────────
 * `page` carries the query it belongs to, and a mismatch reads as
 * `PAGE_SIZE`. Resetting in an effect instead would let one render — and so
 * one fetch — go out with the previous query's limit still applied.
 *
 * ── Debounce is for typing, not for taps ───────────────────────────────────
 * Page one is debounced because it fires per keystroke. "More results" is an
 * explicit press, already rate-limited by the finger, so it runs immediately.
 */
export function useDictionarySearch(query: string, debounceMs = 250): DictionarySearch {
  const [state, setState] = useState<SearchState>({ kind: 'idle' });
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState<{ query: string; limit: number }>({
    query,
    limit: PAGE_SIZE,
  });

  const limit = page.query === query ? page.limit : PAGE_SIZE;
  const isFirstPage = limit === PAGE_SIZE;

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setState({ kind: 'idle' });
      setLoadingMore(false);
      return;
    }

    // Fast path: this page is already in the LRU cache from a previous lookup.
    // Skip the debounce + read and surface results immediately. The user gets
    // instant feedback when re-typing the same query or returning to a
    // previously-viewed search.
    const cached = peekSearch(trimmed, limit);
    if (cached) {
      setState({ kind: 'results', response: cached, query: trimmed });
      setLoadingMore(false);
      return;
    }

    const controller = new AbortController();
    if (isFirstPage) setState({ kind: 'loading' });
    else setLoadingMore(true);

    const timer = setTimeout(
      () => {
        queryDictionary(trimmed, limit, controller.signal)
          .then((response) => {
            if (controller.signal.aborted) return;
            setState({ kind: 'results', response, query: trimmed });
            setLoadingMore(false);
          })
          .catch((err: unknown) => {
            if (controller.signal.aborted) return;
            setState({
              kind: 'error',
              message: err instanceof Error ? err.message : 'Search failed',
            });
            setLoadingMore(false);
          });
      },
      isFirstPage ? debounceMs : 0,
    );

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [query, limit, isFirstPage, debounceMs]);

  // Read off the *rendered* response, so it stays true while the next page is
  // in flight — that is what keeps the button on screen instead of flickering
  // out and back.
  const canLoadMore = state.kind === 'results' && state.response.hasMore;

  const loadMore = useCallback(() => {
    setPage({ query, limit: limit + PAGE_SIZE });
  }, [query, limit]);

  return { state, loadMore, canLoadMore, loadingMore };
}

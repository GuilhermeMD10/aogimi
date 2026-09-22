'use client';

import { useCallback, useEffect, useState } from 'react';
import { clearRecentSearches, getRecentSearches, type RecentSearchItem } from '../lib/storage';

/**
 * The last few lookups on this device, newest first.
 *
 * Each entry holds `{ query, at }` and nothing else — the store never kept a
 * reading, gloss or entry id — so rows can only show the term and its age, and
 * clicking one re-runs the search rather than opening an entry (owner's call,
 * 2026-09-22: the handoff's entry-shaped rows are not built).
 *
 * `loading` covers the first client tick, so the empty state doesn't flash
 * before localStorage has been read. `clear` is the page's "Clear log".
 */
export function useRecentSearches(limit: number) {
  const [items, setItems] = useState<RecentSearchItem[]>([]);
  const [loading, setLoading] = useState(true);

  /* localStorage doesn't exist on the server pass, so this can't be derived
     during render without either breaking SSR or producing a first paint that
     disagrees with hydration. Disabled as a block because the rule reports on
     the setState call, not on the `useEffect` line. */
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setItems(getRecentSearches().slice(0, limit));
    setLoading(false);
  }, [limit]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const clear = useCallback(() => {
    clearRecentSearches();
    setItems([]);
  }, []);

  return { items, loading, clear };
}

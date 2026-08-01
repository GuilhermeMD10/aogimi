'use client';

import { useEffect, useState } from 'react';
import { getRecentSearches, type RecentSearchItem } from '@/features/dictionary';

/**
 * The last few dictionary lookups, newest first.
 *
 * Read from localStorage, so it has to happen in an effect: touching it during
 * render would break the server pass and mismatch hydration. `loading` covers
 * that first client tick so the card shows a skeleton rather than flashing its
 * empty state.
 *
 * Each entry holds only `{ query, at }`. There's no reading, gloss or word id
 * to show — the store keeps the search term and nothing else — so rows render
 * the term and its age and link back into a fresh search.
 */
export function useRecentSearches(limit: number) {
  const [items, setItems] = useState<RecentSearchItem[]>([]);
  const [loading, setLoading] = useState(true);

  /* The rule's "derive it during render instead" advice doesn't apply here: the
     source is localStorage, which doesn't exist on the server pass. Reading it
     during render would either break SSR or produce a first paint that
     disagrees with hydration, so an effect is the only correct place. Disabled
     as a block because the rule reports on the setState call, not on the
     `useEffect` line. */
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setItems(getRecentSearches().slice(0, limit));
    setLoading(false);
  }, [limit]);
  /* eslint-enable react-hooks/set-state-in-effect */

  return { items, loading };
}

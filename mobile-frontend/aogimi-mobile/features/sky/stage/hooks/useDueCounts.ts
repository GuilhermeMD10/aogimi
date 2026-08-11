import { useCallback, useEffect, useState } from 'react';
import { fetchDueCounts } from '@/features/sky/study/lib/studyApi';

type DueCounts = {
  /** Cards due right now across every deck. */
  total: number;
  /** Per-deck counts. **Decks with nothing due are omitted** — read through
   *  `countFor`, which supplies the 0. */
  byDeck: Record<string, number>;
};

const EMPTY: DueCounts = { total: 0, byDeck: {} };

/**
 * Due counts for the whole account, in one request.
 *
 * **Why any screen needs this now.** Since the FSRS-6 port a review only counts
 * if the card is due — grading ahead changes nothing at all. So a "Study" button
 * that can't say whether anything is *due* is a button that will sometimes open
 * a session where every answer silently does nothing. The count is what lets the
 * label tell the truth, and what lets the button refuse when the answer is zero.
 *
 * **Backend-only, deliberately.** The local card store could compute this from
 * `next_due_at` without a round trip, but the two would disagree the moment a
 * review synced from another device — and the *server* is the authority on
 * due-ness, since it is the thing that will accept or ignore the review. A
 * signed-out or offline user gets `total: 0` and a disabled button, which is
 * honest: without a server there is nothing to sync a grade to either.
 */
export function useDueCounts(): {
  counts: DueCounts;
  loading: boolean;
  /** Per-deck lookup that accounts for the omitted-when-zero keys. */
  countFor: (deckId: string) => number;
  /** Re-read after finishing a session, which is the one action that changes
   *  these numbers from inside the app. */
  refresh: () => void;
} {
  const [counts, setCounts] = useState<DueCounts>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    (async () => {
      try {
        const res = await fetchDueCounts(controller.signal);
        if (!cancelled) setCounts(res);
      } catch {
        // Offline or signed out. `EMPTY` is the right answer for both: there is
        // no server to count against, and no server to send a review to either.
        if (!cancelled) setCounts(EMPTY);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [reloadKey]);

  const countFor = useCallback((deckId: string) => counts.byDeck[deckId] ?? 0, [counts]);
  const refresh = useCallback(() => setReloadKey((k) => k + 1), []);

  return { counts, loading, countFor, refresh };
}

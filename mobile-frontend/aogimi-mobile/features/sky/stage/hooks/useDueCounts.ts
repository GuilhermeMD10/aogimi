import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '@/features/auth/providers/AuthContext';
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
 *
 * **Re-read on focus, not on mount.** Same reason as `useDecks` and
 * `useSkyDecks`: tab navigators keep child screens mounted, so a mount effect
 * fires once per app launch and the figure it fetched then would stand for the
 * rest of the session. Due-ness makes that worse than a stale list would be —
 * it is a fact about the clock, so the number goes wrong on its own as cards
 * come due and the day rolls over, on top of going wrong when the user studies.
 * Focus covers all of it, including the return from a study route (which pushes
 * over the tabs, so popping back re-focuses without re-mounting) and a resume
 * from the background followed by any tab switch. Loading only flashes on the
 * first focus; later focuses refresh silently.
 */
export function useDueCounts(): {
  counts: DueCounts;
  loading: boolean;
  /** Per-deck lookup that accounts for the omitted-when-zero keys. */
  countFor: (deckId: string) => number;
  /** Explicit re-read, for a pull-to-refresh. Screen entry and account changes
   *  are already covered, so a caller needs this only to refresh a screen the
   *  user is *looking at*. Silent — it never re-raises `loading`. */
  refresh: () => void;
} {
  const { status, user } = useAuth();

  // The account these numbers belong to. Signed-out is `null` rather than an
  // absent value so a sign-in or sign-out reads as a *change*, which is what
  // re-runs the effect below — without this the hook holds whatever it fetched
  // on first focus, including the previous user's totals.
  const identity = status === 'signed-in' ? user?.id ?? null : null;

  const [counts, setCounts] = useState<DueCounts>(EMPTY);
  const [loading, setLoading] = useState(true);

  // "Has a run ever settled" — drives the one loading flash, and is deliberately
  // a ref rather than derived from `counts`, because a legitimately empty result
  // is indistinguishable from "not loaded yet" in the data itself.
  const firstRunRef = useRef(true);
  const identityRef = useRef<number | null>(identity);

  // The read itself, shared by the focus effect and `refresh` so there is one
  // place that decides what a failure means. Abort is the only cancellation
  // channel — the caller owns the controller.
  const read = useCallback(
    async (signal: AbortSignal) => {
      if (identity === null) {
        // Signed out. `EMPTY` is the final answer here, not a placeholder for
        // one, so there is nothing to ask for.
        setCounts(EMPTY);
        return;
      }
      try {
        const res = await fetchDueCounts(signal);
        if (!signal.aborted) setCounts(res);
      } catch {
        // Offline or a dead session. `EMPTY` is the right answer for both: there
        // is no server to count against, and none to send a review to either.
        // The next focus retries, so connectivity returning fixes the figure
        // without an app restart.
        if (!signal.aborted) setCounts(EMPTY);
      }
    },
    [identity],
  );

  useFocusEffect(
    useCallback(() => {
      const controller = new AbortController();
      let settled = false;

      // A different account invalidates the held figures outright. Dropped
      // before the request rather than after it, so the screen never shows one
      // user's count under another's name.
      if (identityRef.current !== identity) {
        identityRef.current = identity;
        firstRunRef.current = true;
        setCounts(EMPTY);
      }

      const isFirstRun = firstRunRef.current;
      firstRunRef.current = false;
      if (isFirstRun) setLoading(true);

      void read(controller.signal).finally(() => {
        if (controller.signal.aborted) return;
        settled = true;
        setLoading(false);
      });

      return () => {
        // Blurred mid-flight: the flash was never spent, so the next focus is
        // still the first run. Without this a screen left before its first
        // response would be stuck loading for good.
        if (!settled) firstRunRef.current = isFirstRun;
        controller.abort();
      };
    }, [identity, read]),
  );

  const countFor = useCallback((deckId: string) => counts.byDeck[deckId] ?? 0, [counts]);
  const refresh = useCallback(() => {
    void read(new AbortController().signal);
  }, [read]);

  return { counts, loading, countFor, refresh };
}

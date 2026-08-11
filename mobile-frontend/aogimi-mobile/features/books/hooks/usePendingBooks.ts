// Synthesises a `BookRecord[]` from the local pending-import map.
// Lives in its own hook so the library composition (`useBooks`) only
// reads the result and doesn't carry the AsyncStorage read concern.
//
// Each entry produced here carries a `pending:<filename>` id — the
// library tile dispatches taps on those ids through the same reader
// path as synced books (offlineMode true) per the recent bookmark/
// reader-route changes.

import { useCallback, useEffect, useState } from 'react';
import { listPendingBooks } from '../lib/bookPush';
import type { BookRecord } from '../types';

type UsePendingBooksResult = {
  pendingBooks: BookRecord[];
  /** Re-read the local pending map. Use after a local-only commit
   *  (e.g. an offline import) so the new tile shows up immediately
   *  without waiting for the next backend refresh to land. */
  reloadPending: () => Promise<void>;
};

/**
 * @param userId  The current user's backend id (or `0` for guests).
 *                Stamped into each synthetic record's `user_id` field.
 * @param refreshSignal  Any reference whose change should trigger a
 *                       re-read of the local map. The `useBooks`
 *                       composition passes the backend fetch's `data`
 *                       so a successful refresh flushes the pending
 *                       set in case any item flipped from
 *                       pending → synced.
 */
export function usePendingBooks(
  userId: number | undefined,
  refreshSignal: unknown,
): UsePendingBooksResult {
  const [pendingBooks, setPendingBooks] = useState<BookRecord[]>([]);

  const reloadPending = useCallback(async () => {
    if (userId == null) {
      setPendingBooks([]);
      return;
    }
    const list = await listPendingBooks(userId);
    setPendingBooks(list);
  }, [userId]);

  useEffect(() => {
    void reloadPending();
  }, [userId, refreshSignal, reloadPending]);

  return { pendingBooks, reloadPending };
}

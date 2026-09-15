// Three-pass orchestration behind the Sync-now button. Lives here
// (not in `BooksScreen`) so:
//   - The screen owns "render + alert", not the sync pipeline.
//   - Other entry points (settings sync, programmatic) can call the
//     same pipeline without re-implementing the pass ordering.
//
// Ordering:
//   1. reconcile — orphan + stale wipe. Must run before push so a
//      stale local entry doesn't get re-pushed as if it were fresh.
//   2. syncPending — push every pending book entry (creates +
//      identity backfills).
//   3. pushAllReaderState — push CFI + reading progress for already-synced
//      books accumulated during offline sessions.
// Session-pending flags only clear for reader-state pushes that
// finished cleanly; dirty books stay flagged for the next Sync-now.

import { reconcileBooks, syncPending, type ReconcileSummary } from './reconcileBooks';
import { pushAllReaderState, type ReaderStatePushSummary } from './readerStatePush';
import { clearSessionPending } from './syncedBookCache';
import type { SyncSummary } from './bookPush';

export type FullSyncSummary = {
  reconcile: ReconcileSummary;
  push: SyncSummary;
  readerState: ReaderStatePushSummary;
};

/**
 * Push pending reader-state writes and clear the session-pending flag for
 * every book whose push completed cleanly. The flag and the push belong
 * together — a push that leaves the UNSYNCED pill up is what the
 * reconnect auto-push used to do — so every caller goes through here.
 */
export async function pushReaderStateAndSettle(): Promise<ReaderStatePushSummary> {
  const readerState = await pushAllReaderState();
  await Promise.all(readerState.bookIdsClean.map((id) => clearSessionPending(id)));
  return readerState;
}

export async function runFullSync(userId: number): Promise<FullSyncSummary> {
  // Pass 1: orphan + stale wipe.
  const reconcile = await reconcileBooks(userId);

  // Pass 2: push pending books.
  const push = await syncPending(userId);

  // Pass 3: push pending reader-state writes.
  const readerState = await pushReaderStateAndSettle();

  return { reconcile, push, readerState };
}

/**
 * Total count of touched items across the three passes — used by the
 * Sync-now UI to decide between "nothing to sync" and "show details".
 */
export function fullSyncActivityCount(summary: FullSyncSummary): number {
  const { reconcile, push, readerState } = summary;
  return (
    reconcile.staleReplaced.length +
    reconcile.removed.length +
    reconcile.syncedUp.length +
    reconcile.adopted.length +
    push.pushed.length +
    push.failed.length +
    readerState.cfisPushed +
    readerState.bookIdsDirty.length
  );
}

/**
 * Build the per-event lines the Sync-now UI joins into an Alert body.
 * The actual Alert lives in `BooksScreen` so this helper stays pure
 * (testable, reusable from settings / shortcut surfaces).
 */
export function formatFullSyncDetails(summary: FullSyncSummary): string[] {
  const { reconcile, push, readerState } = summary;
  const parts: string[] = [];

  if (reconcile.removed.length > 0) {
    parts.push(`${reconcile.removed.length} removed (deleted on another device)`);
  }
  if (reconcile.staleReplaced.length > 0) {
    parts.push(
      `${reconcile.staleReplaced.length} replaced (different bytes on backend — re-locate to view)`,
    );
  }
  if (push.pushed.length > 0) {
    parts.push(`${push.pushed.length} pushed to cloud`);
  }
  if (push.failed.length > 0) {
    parts.push(`${push.failed.length} couldn't push — try again`);
  }
  if (reconcile.syncedUp.length > 0) {
    parts.push(`${reconcile.syncedUp.length} backfilled with local fingerprint`);
  }
  if (reconcile.adopted.length > 0) {
    parts.push(
      `${reconcile.adopted.length} matched to a book already on your account`,
    );
  }
  if (readerState.cfisPushed > 0) {
    parts.push(
      `${readerState.cfisPushed} reading position${readerState.cfisPushed === 1 ? '' : 's'} synced`,
    );
  }
  if (readerState.bookIdsDirty.length > 0) {
    parts.push(
      `${readerState.bookIdsDirty.length} book${readerState.bookIdsDirty.length === 1 ? '' : 's'} still pending — try again`,
    );
  }
  return parts;
}

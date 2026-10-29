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
import type { Translate } from '@/lib/i18n/I18nContext';

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
 * What the run amounted to, for the alert's title. `unreachable` wins over
 * everything: when the backend list couldn't be fetched nothing was checked,
 * so a run that touched nothing is not "in sync" — it's unknown.
 */
export type FullSyncOutcome = 'unreachable' | 'upToDate' | 'synced' | 'partial' | 'failed';

export function fullSyncOutcome(summary: FullSyncSummary): FullSyncOutcome {
  if (summary.reconcile.skipped) return 'unreachable';
  const failed = summary.push.failed.length + summary.readerState.bookIdsDirty.length;
  const done = fullSyncActivityCount(summary) - failed;
  if (failed === 0) return done === 0 ? 'upToDate' : 'synced';
  return done === 0 ? 'failed' : 'partial';
}

/**
 * Build the per-event lines the Sync-now UI joins into an Alert body.
 * The actual Alert lives in `BooksScreen` so this helper stays pure
 * (testable, reusable from settings / shortcut surfaces); the caller hands
 * in its `t()` for the wording. Every line has a `<key>One` singular twin.
 */
export function formatFullSyncDetails(summary: FullSyncSummary, t: Translate): string[] {
  const { reconcile, push, readerState } = summary;
  const parts: string[] = [];
  const line = (key: string, n: number) => {
    if (n > 0) parts.push(t(`library.syncResult.${n === 1 ? `${key}One` : key}`, { n }));
  };

  line('removed', reconcile.removed.length);
  line('replaced', reconcile.staleReplaced.length);
  line('pushed', push.pushed.length);
  line('pushFailed', push.failed.length);
  line('backfilled', reconcile.syncedUp.length);
  line('adopted', reconcile.adopted.length);
  line('positions', readerState.cfisPushed);
  line('pending', readerState.bookIdsDirty.length);
  return parts;
}

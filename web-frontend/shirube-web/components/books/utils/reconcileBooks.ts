// Books reconcile pass — runs once on first load after auth, and on
// the user-facing "Sync now" button. Aligns local IndexedDB state with
// the backend's canonical book list.
//
// Strategy (matches mobile's equivalent in shape, not in storage):
//
//   1. Fetch backend `getUserBooks`. Trust the response only when it
//      parses cleanly — never wipe on a flaky / empty response.
//   2. For each local IDB book by filename:
//        - backend has same filename:
//             • backend file_hash matches local → keep
//             • backend file_hash differs from local → STALE local bytes,
//               wipe local file + reader_book + reader_progress
//             • backend has hash, local doesn't → backfill local
//             • local has hash, backend doesn't → backfill backend
//        - backend doesn't have it:
//             • try POST /api/books (idempotent on user+filename) to
//               re-register. The matcher inside the POST uses the same
//               file_hash-only auto-attach guard the +-button import does.
//             • if registration succeeds, re-evaluate file_hash match
//             • if registration fails (network), keep local for next pass
//   3. Sweep orphan localStorage `reader_book_<filename>` /
//      `reader_progress_<filename>` entries whose owning book is no
//      longer in IDB.
//
// What we do NOT do here:
//   - Touch backend records that aren't in local IDB. The library UI
//     surfaces them with a "not on this device → locate file" affordance,
//     which is the explicit user-initiated path for getting their bytes.
//   - Run on every refresh. Refresh just re-fetches the list. Reconcile
//     is a heavier operation reserved for first load + the explicit
//     Sync-now action.
//   - Confirm with the user before wiping. Aggressive wipe per the
//     project decision. Add a > 25% safety threshold here if data-loss
//     anxiety becomes an issue.

import {
  deleteBook as deleteLocalBook,
  ensureBackendBook,
  getAllBooks,
  type BookRecord,
} from './bookStore';
import {
  getUserBooks,
  updateBookIdentity as apiUpdateBookIdentity,
} from './booksApi';
import { wipeBookLocalState } from '@/lib/auth/wipeBookLocalState';
import { effectiveSyncState, pushAllPending, type SyncSummary } from '@/lib/sync';
import type { BookProgressRecord } from '@/lib/types';

export type ReconcileSummary = {
  /** Filenames whose local state was wiped because the backend file_hash
   *  differed from the local fileHash — the user re-uploaded different
   *  bytes under the same filename on another device. */
  staleReplaced: string[];
  /** Filenames whose local state was wiped because the backend lost the
   *  record AND a registration retry failed/returned no match. Likely
   *  user-deleted on another device. */
  removed: string[];
  /** Filenames that existed only locally; reconcile successfully re-
   *  registered them on the backend. */
  syncedUp: string[];
};

/**
 * Run the reconcile pass for the given user. Best-effort: any single
 * failure (network blip mid-pass, IDB error on one book) does not stop
 * the rest. Returns a summary so the UI can show what happened.
 *
 * Idempotent — safe to run multiple times. Re-running after a transient
 * failure will pick up where the last pass left off.
 */
export async function reconcileBooks(userId: number): Promise<ReconcileSummary> {
  const summary: ReconcileSummary = {
    staleReplaced: [],
    removed: [],
    syncedUp: [],
  };

  // 1. Fetch backend list. Bail early if the response isn't a usable
  //    array — a transient backend error must NOT translate into a
  //    "wipe everything local" event.
  let remoteBooks: BookProgressRecord[];
  try {
    remoteBooks = await getUserBooks(userId);
    if (!Array.isArray(remoteBooks)) return summary;
  } catch {
    return summary;
  }
  const remoteByFilename = new Map(remoteBooks.map((b) => [b.filename, b]));

  // 2. Snapshot local IDB books. If this fails, we have no work to do.
  let localBooks: BookRecord[];
  try {
    localBooks = await getAllBooks();
  } catch {
    return summary;
  }

  for (const local of localBooks) {
    let remote = remoteByFilename.get(local.filename);
    const syncState = effectiveSyncState(local);

    // Pending books are intentionally local-only awaiting a manual push
    // (Sync-now or per-tile sync). They have no backend twin BY DESIGN —
    // skip every check below.
    if (syncState === 'pending') continue;

    // 2a. Synced book missing from backend — try to re-register before
    //     deciding it's an orphan. Catches the "local synced fingerprint
    //     went missing from backend" edge case (rare).
    if (!remote) {
      try {
        remote = await ensureBackendBook(local, userId);
        summary.syncedUp.push(local.filename);
      } catch {
        // Backend unreachable / rejected. Keep local; the next reconcile
        // will retry. We do NOT wipe on this path because we can't
        // distinguish "you deleted this on another device" from "your
        // network just blinked".
        continue;
      }
    }

    if (!remote) continue;

    // 2b. Both sides agree on identity. The only meaningful comparison
    //     is file_hash — every other matcher field can collide between
    //     distinct books (see AUTO_ATTACH_TYPES in
    //     books/locateAndAttachFile.ts for why).
    const localHash = local.fileHash ?? null;
    const remoteHash = remote.file_hash ?? null;

    if (localHash && remoteHash && localHash !== remoteHash) {
      // Stale local bytes: another device re-uploaded different content
      // under this filename. Reader state (CFI, page positions) is
      // anchored to byte offsets and will not map cleanly, so wipe.
      // User sees "not on this device" and can re-locate.
      await wipeLocalEverything(local.filename);
      summary.staleReplaced.push(local.filename);
      continue;
    }

    if (remoteHash && !localHash) {
      // Backend has the hash, local lost it (or never had it). The
      // BookRecord update is a low-priority backfill; the next import
      // or backfill flow will compute and store it for real.
      continue;
    }

    if (localHash && !remoteHash) {
      // Local has a hash, backend doesn't — backfill backend so the
      // next cross-device matcher pass has the strong signal it needs.
      try {
        await apiUpdateBookIdentity(remote.id, {
          fileHash: localHash,
          contentHash: local.contentHash ?? null,
          pdfIdOriginal: local.pdfIdOriginal,
          pdfIdCurrent: local.pdfIdCurrent,
          pageCount: local.pageCount,
          hasTextLayer: local.hasTextLayer,
          producer: local.producer,
          xmpDocumentId: local.xmpDocumentId,
          xmpOriginalId: local.xmpOriginalId,
          pageHashes: local.pageHashes,
          textLength: local.textLength,
          detectedDoi: local.detectedDoi,
          detectedIsbn: local.detectedIsbn,
          pagePhashes: local.pagePhashes,
          fingerprintVersion: local.fingerprintVersion,
          dcIdentifier: local.dcIdentifier,
          language: local.language,
          publisher: local.publisher,
        });
      } catch {
        /* best-effort backfill */
      }
    }
    // Both null or both equal → no action needed.
  }

  // 3. Sweep orphan localStorage entries. After the per-book pass above,
  //    re-read local books because some may have been wiped.
  let remaining: BookRecord[];
  try {
    remaining = await getAllBooks();
  } catch {
    return summary;
  }
  const remainingFilenames = new Set(remaining.map((b) => b.filename));
  cleanupOrphanLocalStorage(remainingFilenames, summary);

  return summary;
}

/**
 * Pass 2 of Sync-now: push every locally-pending book to the backend.
 * Delegates to `lib/sync/push.pushAllPending` — the reconcile module is
 * the single public entry point for "sync" operations callers reach for.
 */
export async function syncPending(
  userId: number,
  deviceId: string,
): Promise<SyncSummary> {
  return pushAllPending(userId, deviceId);
}

async function wipeLocalEverything(filename: string): Promise<void> {
  // Drop IDB book + raw file blob.
  try {
    await deleteLocalBook(filename);
  } catch {
    /* */
  }
  // Drop localStorage keys (reader_book_<filename>, reader_progress_<filename>).
  wipeBookLocalState(filename);
}

function cleanupOrphanLocalStorage(
  validFilenames: ReadonlySet<string>,
  summary: ReconcileSummary,
): void {
  if (typeof window === 'undefined') return;
  const PREFIXES = ['reader_book_', 'reader_progress_'] as const;
  try {
    const toRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      for (const prefix of PREFIXES) {
        if (key.startsWith(prefix)) {
          const filename = key.slice(prefix.length);
          if (!validFilenames.has(filename)) toRemove.push(key);
          break;
        }
      }
    }
    for (const key of toRemove) {
      localStorage.removeItem(key);
      // Track each unique filename once.
      const filename = key.replace(/^reader_(book|progress)_/, '');
      if (!summary.removed.includes(filename)) summary.removed.push(filename);
    }
  } catch {
    /* private mode / quota — best-effort */
  }
}

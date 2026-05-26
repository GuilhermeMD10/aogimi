// Library reconcile pass — mobile mirror of
// `web-frontend/shirube-web/lib/library/reconcileLibrary.ts`.
//
// Two responsibilities, kept as separate exported functions:
//
//   reconcileLibrary(userId)
//     The cheap "align local with cloud" pass. Wipes orphan and
//     stale-bytes entries. Honors `syncState: 'pending'` — those are
//     intentional local-only books awaiting a manual push, NOT orphans.
//     Runs on first-load after auth (silent) AND as pass 1 of the
//     Sync-now button.
//
//   syncPending(userId, deviceId)
//     The "push everything pending" pass. Iterates the local sync map,
//     pushes each `pending` entry to the backend, flips to `synced` on
//     success. Runs as pass 2 of the Sync-now button. Not used by
//     first-load — local-only books only get pushed on explicit user
//     consent (the Sync-now tap or the per-tile sync badge).
//
// All AsyncStorage access goes through `lib/sync/localState` which
// reads the map in a single batch — important when a user has many
// books, because per-book AsyncStorage parses become O(N²) otherwise.

import {
  fetchUserBooks,
  updateBookIdentity as apiUpdateBookIdentity,
} from './booksApi';
import { wipeBookLocalState } from '@/lib/auth/wipeBookLocalState';
import {
  deleteBookFile,
  listLocalBookFilenames,
} from './bookPaths';
import {
  coverSafeNameFor,
  deleteCoverBySafeName,
  listCoverSafeNames,
} from './epubCover';
import { listStoredBookFilenames } from '@/components/reader/utils/readerStorage';
import {
  effectiveSyncState,
  readAllEntries,
  removeEntry,
  setStoredFileHash,
} from './bookLocalState';
import { pushAllPending, type SyncSummary } from './bookPush';
import type { BookRecord } from '../types';

export type ReconcileSummary = {
  /** Filenames whose local file + state was wiped because the backend's
   *  file_hash differed from the stored local fingerprint (another
   *  device replaced the bytes under this filename). */
  staleReplaced: string[];
  /** Filenames whose local file + state was wiped because the backend
   *  no longer has the record (likely user-deleted on another device).
   *  Pending-syncState entries are NEVER wiped here — they're
   *  intentionally local-only awaiting a manual push. */
  removed: string[];
  /** Filenames whose backend identity got backfilled with the local
   *  fingerprint (backend had null hash, local had one). */
  syncedUp: string[];
};

/**
 * Reconcile local state with the backend's canonical list. Cheap and
 * idempotent. Doesn't push pending books — call `syncPending` for that.
 */
export async function reconcileBooks(userId: number): Promise<ReconcileSummary> {
  const summary: ReconcileSummary = {
    staleReplaced: [],
    removed: [],
    syncedUp: [],
  };

  // 1. Backend list. Bail on transient errors so a network blip doesn't
  //    translate into a wipe-everything event.
  let remoteBooks: BookRecord[];
  try {
    remoteBooks = await fetchUserBooks(userId);
    if (!Array.isArray(remoteBooks)) return summary;
  } catch {
    return summary;
  }
  const remoteByFilename = new Map(remoteBooks.map((b) => [b.filename, b]));

  // 2. Read the local sync map in one shot. Per-book reads would parse
  //    the JSON N times — O(N²) for users with many books.
  const localEntries = await readAllEntries();

  // 3. Walk local FS book files. Any FS file is the canonical "I have
  //    bytes for this book on this device" signal.
  let localFiles: string[];
  try {
    localFiles = listLocalBookFilenames();
  } catch {
    localFiles = [];
  }

  for (const filename of localFiles) {
    const remote = remoteByFilename.get(filename);
    const entry = localEntries[filename];
    const syncState = entry ? effectiveSyncState(entry) : 'synced';

    // Pending books are intentional local-only awaiting a manual push.
    // They have no backend twin BY DESIGN — skip every check below.
    if (syncState === 'pending') continue;

    if (!remote) {
      // Synced book that lost its backend twin = deleted on another
      // device (or backend wipe). Drop local.
      await wipeLocalEverything(filename);
      summary.removed.push(filename);
      continue;
    }

    const localHash = entry?.fileHash ?? null;
    const remoteHash = remote.file_hash ?? null;

    if (localHash && remoteHash && localHash !== remoteHash) {
      // Another device replaced the bytes under this filename. Reader
      // state (CFI, page positions) anchored to old bytes — wipe.
      await wipeLocalEverything(filename);
      summary.staleReplaced.push(filename);
      continue;
    }

    if (remoteHash && !localHash) {
      // Backfill local cache with backend's hash so the defensive
      // reimport check has a baseline next time.
      await setStoredFileHash(filename, remoteHash);
      continue;
    }

    if (localHash && !remoteHash) {
      // Backfill backend with local's hash so cross-device match has
      // the strong file_hash signal it needs.
      try {
        await apiUpdateBookIdentity(remote.id, { fileHash: localHash });
        summary.syncedUp.push(filename);
      } catch {
        /* best-effort */
      }
    }
    // Both null or both equal → no action.
  }

  // 4. Orphan sweep across the three derived storage layers. Re-read
  //    local files after the wipe loop because some were removed.
  let survivingLocal: string[];
  try {
    survivingLocal = listLocalBookFilenames();
  } catch {
    survivingLocal = [];
  }
  const survivingSet = new Set(survivingLocal);

  await sweepOrphanReaderBookEntries(survivingSet);
  await sweepOrphanFingerprints(survivingSet);
  sweepOrphanCovers(survivingSet);

  return summary;
}

/**
 * Pass 2 of Sync-now: push every locally-pending book to the backend.
 * Delegates to `lib/sync/push.pushAllPending` — separated here so the
 * library reconcile module remains the public entry point for "sync"
 * operations and callers don't reach into `lib/sync` directly.
 */
export async function syncPending(userId: number): Promise<SyncSummary> {
  return pushAllPending(userId);
}

async function wipeLocalEverything(filename: string): Promise<void> {
  try {
    deleteBookFile(filename);
  } catch {
    /* */
  }
  // wipeBookLocalState drops reader_book_<filename>, cover, and the
  // sync-map entry. Mobile has no per-filename IDB metadata to delete
  // beyond that.
  try {
    await wipeBookLocalState(filename);
  } catch {
    /* */
  }
}

async function sweepOrphanReaderBookEntries(
  valid: ReadonlySet<string>,
): Promise<void> {
  try {
    const filenames = await listStoredBookFilenames();
    for (const filename of filenames) {
      if (!valid.has(filename)) {
        // Use the public wipe helper so we never miss a sibling cleanup
        // (e.g. if a future register joins the per-filename group).
        await wipeBookLocalState(filename);
      }
    }
  } catch {
    /* best-effort */
  }
}

async function sweepOrphanFingerprints(valid: ReadonlySet<string>): Promise<void> {
  // Note: pending entries WITHOUT a backing local file would also be
  // dropped here. That's correct — without bytes there's nothing to
  // push, the entry is orphaned snapshot metadata.
  try {
    const entries = await readAllEntries();
    for (const filename of Object.keys(entries)) {
      if (!valid.has(filename)) await removeEntry(filename);
    }
  } catch {
    /* best-effort */
  }
}

function sweepOrphanCovers(valid: ReadonlySet<string>): void {
  try {
    const validSafeNames = new Set(
      Array.from(valid).map((f) => coverSafeNameFor(f)),
    );
    for (const safe of listCoverSafeNames()) {
      if (!validSafeNames.has(safe)) deleteCoverBySafeName(safe);
    }
  } catch {
    /* best-effort */
  }
}

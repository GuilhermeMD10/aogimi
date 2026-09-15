// Drain reading positions the reader couldn't push — a session read while
// offline, or a keepalive the browser dropped on tab close. Web has no
// Sync-now button by design, so this runs on every library load, the same
// moment `syncLocalBooksToBackend` drains unregistered books.
//
// Each snapshot goes up with its own `updatedAt` as `lastReadAt`, so the
// backend's most-recent-wins guard decides: if another device has read
// further since, the server keeps its row and hands it back, and that is
// what the caller merges. Either way the local snapshot is then marked
// synced — the backend has something at least as new.

import { updateBookProgress } from '../booksApi';
import type { BookRecord } from '../bookStore';
import { findRemoteTwin } from '../pairBooks';
import {
  getReaderProgress,
  isReaderProgressUnsynced,
  markReaderProgressSynced,
} from '../readerSession';
import type { BookProgressRecord } from '@/features/books/types';

/**
 * Push every unsynced local snapshot that has a backend twin. `remotes` is
 * updated IN PLACE with the row the server answers, so the caller's merge
 * sees the pushed (or newer server-side) progress without a second fetch.
 * Best-effort: a book that fails stays unsynced and retries next load.
 */
export async function pushUnsyncedProgress(
  localBooks: BookRecord[],
  remotes: BookProgressRecord[],
): Promise<void> {
  for (const local of localBooks) {
    const snapshot = getReaderProgress(local.filename);
    if (!snapshot || !isReaderProgressUnsynced(snapshot)) continue;
    const remote = findRemoteTwin(local, remotes);
    if (!remote) continue;
    try {
      const answered = await updateBookProgress(remote.id, {
        cfiPosition: snapshot.cfi || undefined,
        progress: snapshot.progress,
        spineIndex: snapshot.spineIndex,
        totalSpineItems: snapshot.totalSpineItems,
        lastReadAt: new Date(snapshot.updatedAt).toISOString(),
      });
      markReaderProgressSynced(local.filename, snapshot.updatedAt);
      const i = remotes.indexOf(remote);
      if (i >= 0) remotes[i] = answered;
    } catch {
      /* offline or rejected — stays unsynced, next load retries */
    }
  }
}

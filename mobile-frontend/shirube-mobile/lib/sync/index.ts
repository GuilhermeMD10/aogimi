// Public surface of the mobile sync module. Consumers import from here
// rather than reaching into the individual files — the directory layout
// inside is implementation detail.
//
// See `docs/SYNC_ARCHITECTURE.md` for the conceptual model.

export type {
  LocalBookEntry,
  PendingPayload,
  SyncState,
} from './types';

export {
  clearAll,
  effectiveSyncState,
  getEntry,
  getStoredFileHash,
  listFilenames,
  markPending,
  markSynced,
  readAllEntries,
  removeEntry,
  setStoredFileHash,
} from './localState';

export {
  filenameFromPendingId,
  isPendingBookId,
  listPendingBooks,
  markPendingAndAttemptPush,
  pushAllPending,
  pushOneBook,
  type PushResult,
  type SyncSummary,
} from './push';

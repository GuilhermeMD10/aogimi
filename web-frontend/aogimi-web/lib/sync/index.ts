// Public surface of the web sync module. Consumers import from here
// rather than reaching into the individual files.
//
// See `docs/SYNC_ARCHITECTURE.md` for the conceptual model.

export type { SyncState } from './types';

export {
  effectiveSyncState,
  listPending,
  markPending,
  markSynced,
} from './localState';

export {
  pushAllPending,
  pushOneBook,
  type PushResult,
  type SyncSummary,
} from './push';

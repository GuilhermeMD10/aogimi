// ── Backend records ─────────────────────────────────────────────────────────

export type DeckRecord = {
  id: string;
  user_id: number;
  name: string;
  description: string;
  created_at: string;
};

export type CardState = 'new' | 'seen' | 'learned' | 'mastered';

export type CardRecord = {
  id: string;
  deck_id: string;
  front: string;
  reading: string;
  back: string;
  notes: string;
  context_sentence: string;
  state: CardState;
  reviewed_times: number;
  // SRS columns from migration 022. last_reviewed_at is null for
  // never-reviewed cards; difficulty / stability default to 0.30 / 2.0
  // on creation.
  difficulty: number;
  stability: number;
  last_outcomes: string;
  last_reviewed_at: string | null;
  created_at: string;
};

// ── Local-first sync wrappers ───────────────────────────────────────────────
//
// Decks and cards are pure metadata (small JSON) so the mobile app stores
// the FULL record locally — unlike books, which only need a sync-state
// marker alongside the file on disk. The local store IS the source of truth
// for rendering; backend GETs hydrate it; writes go local-first then
// opportunistically push.

export type SyncState = 'synced' | 'pending';

/**
 * What kind of pending operation a record is waiting to push. Set when a
 * local write happens and the backend push hasn't yet succeeded; cleared on
 * `markSynced`. `'create'` means the backend has no twin yet; the local id
 * is a client-side UUID that gets replaced by the backend id after push.
 * `'update'`/`'delete'` apply to records that already have a real backend id.
 */
export type PendingOp = 'create' | 'update' | 'delete';

export type LocalDeck = DeckRecord & {
  syncState: SyncState;
  pendingOp?: PendingOp;
};

export type LocalCard = CardRecord & {
  syncState: SyncState;
  pendingOp?: PendingOp;
};

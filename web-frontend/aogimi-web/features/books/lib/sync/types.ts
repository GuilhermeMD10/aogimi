// Per-book sync state on web. Mirrors the mobile sync types
// conceptually — same `synced | pending` discriminator, same import
// semantics. The shape differs because web's `BookRecord` in IndexedDB
// already carries the full metadata; there's no separate
// `pendingPayload` snapshot.
//
// See `docs/SYNC_ARCHITECTURE.md` for the conceptual model and state
// transitions.

/**
 * What the local device thinks about this book's relationship to the
 * backend record. Absent means "no local entry exists" — book is
 * cloud-only or doesn't exist on this user's account.
 */
export type SyncState = 'synced' | 'pending';

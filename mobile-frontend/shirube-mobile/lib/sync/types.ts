// Per-book sync state — the union of what a single device knows about
// where one book lives (local file? backend record? both? neither?).
// Discriminator: `syncState` on the local entry.
//
// See `docs/SYNC_ARCHITECTURE.md` for the conceptual model and state
// transitions. This file is the canonical TypeScript surface of the
// types other modules in `lib/sync/` and consumers (HomeScreen,
// reconcileLibrary, etc.) read from.

/**
 * What the local device thinks about this book's relationship to the
 * backend record. Absent means "no local entry exists" — the book is
 * either cloud-only (backend has it, we don't) or doesn't exist at all
 * for this user.
 */
export type SyncState = 'synced' | 'pending';

/**
 * Snapshot of the metadata captured at offline-import time. Used to
 * retry POST /api/books later (via Sync-now) without re-probing the
 * file. Mobile only — web's IndexedDB BookRecord already carries the
 * full metadata in the same row.
 *
 * Fields mirror the `createBook` payload accepted by the backend (see
 * `backend/API_ROUTES.md` → POST /api/books). When adding a new backend
 * identity field, add it here too so a deferred sync doesn't drop it.
 */
export type PendingPayload = {
  title: string;
  author: string;
  fileHash: string | null;
  contentHash: string | null;
  pdfIdOriginal: string | null;
  pdfIdCurrent: string | null;
  pageCount: number | null;
  hasTextLayer: boolean | null;
  producer: string | null;
  xmpDocumentId: string | null;
  xmpOriginalId: string | null;
  pageHashes: string[] | null;
  textLength: number | null;
  detectedDoi: string | null;
  detectedIsbn: string | null;
  pagePhashes: string[] | null;
  fingerprintVersion: number;
  dcIdentifier: string | null;
  language: string | null;
  publisher: string | null;
};

/**
 * The persisted shape of a single local book entry on mobile. Stored
 * in AsyncStorage under the `book_fingerprints_v1` key as a JSON map
 * keyed by filename.
 *
 * Backward-compat: legacy entries (pre-sync-state) only had `fileHash`.
 * Readers treat `syncState === undefined` as `'synced'` — those entries
 * came from imports that successfully pushed before the marker existed.
 *
 * Forward-compat: only `fileHash` is required. New optional fields can
 * be added without a key bump as long as readers handle their absence.
 */
export type LocalBookEntry = {
  fileHash: string;
  syncState?: SyncState;
  /**
   * Only meaningful when `syncState === 'pending'`. Carries the
   * metadata snapshot needed to retry the POST /api/books push.
   */
  pendingPayload?: PendingPayload;
};

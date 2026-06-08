// Push pending books to the backend — the network half of the sync
// state machine. Local state writes live in `./localState`. Callers:
//
//   - `HomeScreen.handleImport` — opportunistic push immediately after
//     a local import.
//   - `HomeScreen.handleSyncNow` / per-tile sync action — explicit
//     user-triggered push of one or all pending books.
//
// Every function here is best-effort: failure means the book stays
// in `pending` for a later retry. Caller does NOT need to wrap calls
// in try/catch — push functions return discriminated results.

import {
  createBook,
  matchBooks,
  updateBookIdentity,
} from './booksApi';
import type { BookRecord, LocalBookEntry, PendingPayload } from '../types';
import { getEntry, markPending, markSynced, readAllEntries } from './bookLocalState';
import { pushForBook } from './readerStatePush';

export type PushResult =
  | { ok: true; bookId: string }
  | { ok: false; reason: 'network' | 'rejected' };

export type SyncSummary = {
  pushed: string[];
  failed: string[];
};

/**
 * Build the match-candidate shape from a pending payload. Same shape
 * the +-button import flow constructs from an `ImportedBook` — keeps
 * the match-priority order consistent across flows.
 */
function candidateFrom(filename: string, payload: PendingPayload) {
  return {
    file_hash: payload.fileHash,
    content_hash: payload.contentHash,
    pdf_id_original: payload.pdfIdOriginal,
    xmp_original_id: payload.xmpOriginalId,
    detected_doi: payload.detectedDoi,
    detected_isbn: payload.detectedIsbn,
    page_count: payload.pageCount,
    page_phashes: payload.pagePhashes,
    metadata: {
      title: payload.title || filename,
      author: payload.author,
      dc_identifier: payload.dcIdentifier,
      filename,
    },
  };
}

/**
 * Push one book to the backend using its previously-stored
 * pendingPayload. On success: marks the local entry as synced.
 *
 * Push strategy mirrors the +-button import flow:
 *   1. matchBooks — if a `file_hash` match exists, attach to it
 *      (same AUTO_ATTACH_TYPES rule the import flow uses).
 *   2. Otherwise createBook with the snapshot.
 *
 * Returns `ok: true` with the bookId for the caller to e.g. wire into
 * a router push or further sync UI. Returns `ok: false` on any failure
 * (network, validation, backend 5xx, etc.) — caller's responsibility
 * to surface or ignore.
 */
export async function pushOneBook(
  userId: number,
  filename: string,
  payload: PendingPayload,
): Promise<PushResult> {
  let bookId: string | null = null;
  try {
    const [matchResult] = await matchBooks(userId, [candidateFrom(filename, payload)]);
    // Only the file_hash match type is safe to silently attach to —
    // weaker matches (pdf_trailer_id, xmp_original_id, etc.) can
    // collide between distinct books. Same rule the import + locate
    // flows enforce.
    if (matchResult?.match && matchResult.match_type === 'file_hash') {
      bookId = matchResult.match.id;
      // Backfill any backend fields the existing row was missing so
      // the next cross-device matcher pass has the strong signals.
      void updateBookIdentity(bookId, {
        fileHash: payload.fileHash ?? undefined,
        contentHash: payload.contentHash ?? undefined,
        pdfIdOriginal: payload.pdfIdOriginal ?? undefined,
        pdfIdCurrent: payload.pdfIdCurrent ?? undefined,
        pageCount: payload.pageCount ?? undefined,
        hasTextLayer: payload.hasTextLayer ?? undefined,
        producer: payload.producer ?? undefined,
        xmpDocumentId: payload.xmpDocumentId ?? undefined,
        xmpOriginalId: payload.xmpOriginalId ?? undefined,
        pageHashes: payload.pageHashes ?? undefined,
        textLength: payload.textLength ?? undefined,
        detectedDoi: payload.detectedDoi ?? undefined,
        detectedIsbn: payload.detectedIsbn ?? undefined,
        pagePhashes: payload.pagePhashes ?? undefined,
        fingerprintVersion: payload.fingerprintVersion,
        dcIdentifier: payload.dcIdentifier ?? undefined,
        language: payload.language ?? undefined,
        publisher: payload.publisher ?? undefined,
      }).catch((err) => {
        console.warn('[bookPush] updateBookIdentity backfill failed', err);
      });
    }
  } catch {
    return { ok: false, reason: 'network' };
  }

  if (!bookId) {
    try {
      const created = await createBook(userId, {
        filename,
        title: payload.title || filename,
        author: payload.author,
        fileHash: payload.fileHash,
        contentHash: payload.contentHash,
        pdfIdOriginal: payload.pdfIdOriginal,
        pdfIdCurrent: payload.pdfIdCurrent,
        pageCount: payload.pageCount,
        hasTextLayer: payload.hasTextLayer,
        producer: payload.producer,
        xmpDocumentId: payload.xmpDocumentId,
        xmpOriginalId: payload.xmpOriginalId,
        pageHashes: payload.pageHashes,
        textLength: payload.textLength,
        detectedDoi: payload.detectedDoi,
        detectedIsbn: payload.detectedIsbn,
        pagePhashes: payload.pagePhashes,
        fingerprintVersion: payload.fingerprintVersion,
        dcIdentifier: payload.dcIdentifier,
        language: payload.language,
        publisher: payload.publisher,
      });
      bookId = created.id;
    } catch {
      return { ok: false, reason: 'network' };
    }
  }

  await markSynced(filename);
  return { ok: true, bookId };
}

/**
 * Iterate every locally-pending book and push each. Used by:
 *   - first-load reconcile (no — first-load doesn't push automatically
 *     per the architecture decision; this is for Sync-now only)
 *   - the explicit Sync-now button.
 *
 * Sequential by design so progress can be surfaced one-by-one without
 * a fan-out spike on the backend. Failures don't stop the loop.
 */
export async function pushAllPending(userId: number): Promise<SyncSummary> {
  const entries = await readAllEntries();
  const summary: SyncSummary = { pushed: [], failed: [] };
  for (const [filename, entry] of Object.entries(entries)) {
    if (entry.syncState !== 'pending') continue;
    if (!entry.pendingPayload) {
      // Defensive: pending without a payload can't push. Treat as
      // structurally invalid; user can re-import to repair.
      summary.failed.push(filename);
      continue;
    }
    const result = await pushOneBook(userId, filename, entry.pendingPayload);
    if (result.ok) {
      summary.pushed.push(filename);
    } else {
      summary.failed.push(filename);
    }
  }
  return summary;
}

/**
 * Convenience for the import flow: takes a fresh import's filename +
 * payload, marks it pending in storage, then attempts an opportunistic
 * push. Returns whether the push succeeded so the caller can give the
 * user immediate feedback. Either way, the local entry exists.
 */
export async function markPendingAndAttemptPush(
  userId: number,
  filename: string,
  fileHash: string,
  payload: PendingPayload,
): Promise<PushResult> {
  // Always mark pending FIRST — guarantees the local marker exists
  // even if the network call below throws synchronously for any reason.
  await markPending(filename, fileHash, payload);
  return pushOneBook(userId, filename, payload);
}

/**
 * Build a synthetic `BookRecord` for a single pending entry. Shared by
 * `listPendingBooks` (library list) and `useBookRecord` (reader entry
 * point for a pending book opened as a guest or offline). Timestamps
 * come from the entry's `firstSeenAt` so the tile reflects when the
 * book was actually imported, not when the helper was called.
 *
 * `entry.pendingPayload` is required; the helper assumes the caller
 * already gated on syncState === 'pending' && pendingPayload != null.
 */
export function buildPendingBookRecord(
  filename: string,
  entry: LocalBookEntry,
  userId: number,
): BookRecord {
  const p = entry.pendingPayload!;
  const ts = p.firstSeenAt ?? new Date().toISOString();
  return {
    id: `pending:${filename}`,
    user_id: userId,
    filename,
    title: p.title || filename,
    author: p.author,
    cover_color: '#4A4038',
    cfi_position: null,
    spine_index: 0,
    total_spine_items: null,
    progress: 0,
    started_at: ts,
    last_read_at: ts,
    created_at: ts,
    file_hash: p.fileHash,
    content_hash: p.contentHash,
    pdf_id_original: p.pdfIdOriginal,
    pdf_id_current: p.pdfIdCurrent,
    page_count: p.pageCount,
    has_text_layer: p.hasTextLayer,
    producer: p.producer,
    xmp_document_id: p.xmpDocumentId,
    xmp_original_id: p.xmpOriginalId,
    page_hashes: p.pageHashes,
    text_length: p.textLength,
    detected_doi: p.detectedDoi,
    detected_isbn: p.detectedIsbn,
    page_phashes: p.pagePhashes,
    fingerprint_version: p.fingerprintVersion,
    dc_identifier: p.dcIdentifier,
    language: p.language,
    publisher: p.publisher,
  };
}

/**
 * Build a synthetic `BookRecord` for each locally-pending book. Used by
 * `useBooks` to surface pending books in the library list before they
 * have a backend record. The synthetic id is `pending:<filename>` so
 * the library tile's open handler can route reads through `useBookRecord`,
 * which rebuilds the same shape via `buildPendingBookRecord`.
 */
export async function listPendingBooks(userId: number): Promise<BookRecord[]> {
  const entries = await readAllEntries();
  const result: BookRecord[] = [];
  for (const [filename, entry] of Object.entries(entries)) {
    if (entry.syncState !== 'pending' || !entry.pendingPayload) continue;
    result.push(buildPendingBookRecord(filename, entry, userId));
  }
  return result;
}

/** Whether a `BookRecord.id` is one we synthesized for a pending book.
 *  Library tile click handlers use this to distinguish "tap to read"
 *  from "tap to sync first". */
export function isPendingBookId(id: string): boolean {
  return id.startsWith('pending:');
}

/** Extract the filename embedded in a synthetic pending book id. */
export function filenameFromPendingId(id: string): string {
  return id.startsWith('pending:') ? id.slice('pending:'.length) : id;
}

/**
 * Per-book sync triggered from the library tile's actions menu.
 *
 *   - Pending book (synthetic id `pending:<filename>`): look up the local
 *     entry and push it via `pushOneBook`. Returns `ok: false` on network
 *     failure so the caller can show "still pending" feedback.
 *   - Already-synced book: push any unsent reader state (CFI/bookmarks)
 *     for just this book via `pushForBook`. Returns `ok: false` if any of
 *     those calls failed.
 *
 * Intentionally narrow — no reconcile pass, no cache rewrite. The caller
 * is expected to follow up with a list refresh so the tile re-renders
 * with the new sync state.
 */
export async function syncOneBookOnDemand(
  userId: number,
  book: { id: string; filename: string },
): Promise<{ ok: true } | { ok: false; reason: 'network' | 'rejected' }> {
  if (isPendingBookId(book.id)) {
    const entry = await getEntry(book.filename);
    if (!entry || entry.syncState !== 'pending' || !entry.pendingPayload) {
      // Stale tile — entry was already pushed (or never recorded). Treat
      // as success; the next refresh will drop the pending marker.
      return { ok: true };
    }
    const result = await pushOneBook(userId, book.filename, entry.pendingPayload);
    return result.ok ? { ok: true } : { ok: false, reason: result.reason };
  }

  // Synced book: only reader-state writes (CFI, bookmarks) can be pending.
  // pushForBook returns `clean: true` when every write succeeded or there
  // was nothing to push.
  try {
    const result = await pushForBook(book as BookRecord);
    return result.clean ? { ok: true } : { ok: false, reason: 'network' };
  } catch {
    return { ok: false, reason: 'network' };
  }
}

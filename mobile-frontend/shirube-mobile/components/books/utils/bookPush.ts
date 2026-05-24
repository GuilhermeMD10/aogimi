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
  markBookAvailable,
  matchBooks,
  updateBookIdentity,
} from './booksApi';
import type { BookRecord, PendingPayload } from '../types';
import { markPending, markSynced, readAllEntries } from './bookLocalState';

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
 * pendingPayload. On success: marks the local entry as synced and
 * marks the device as having the book available.
 *
 * Push strategy mirrors the +-button import flow:
 *   1. matchBooks — if a `file_hash` match exists, attach to it
 *      (same AUTO_ATTACH_TYPES rule the import flow uses).
 *   2. Otherwise createBook with the snapshot.
 *   3. Either way, markBookAvailable so the device-books listing knows
 *      this device has the file locally.
 *
 * Returns `ok: true` with the bookId for the caller to e.g. wire into
 * a router push or further sync UI. Returns `ok: false` on any failure
 * (network, validation, backend 5xx, etc.) — caller's responsibility
 * to surface or ignore.
 */
export async function pushOneBook(
  userId: number,
  deviceId: string,
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
      }).catch(() => undefined);
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

  // Best-effort availability mark — doesn't gate the success path.
  markBookAvailable(deviceId, bookId, userId).catch(() => undefined);

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
export async function pushAllPending(
  userId: number,
  deviceId: string,
): Promise<SyncSummary> {
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
    const result = await pushOneBook(userId, deviceId, filename, entry.pendingPayload);
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
  deviceId: string,
  filename: string,
  fileHash: string,
  payload: PendingPayload,
): Promise<PushResult> {
  // Always mark pending FIRST — guarantees the local marker exists
  // even if the network call below throws synchronously for any reason.
  await markPending(filename, fileHash, payload);
  return pushOneBook(userId, deviceId, filename, payload);
}

/**
 * Build a synthetic `BookRecord` for each locally-pending book. Used by
 * `useBooks` to surface pending books in the library list before they
 * have a backend record. The synthetic id is `pending:<filename>` so
 * the library tile's open handler can intercept the tap and show a
 * "sync first to read" prompt instead of routing to the reader (the
 * reader fetches by backend id, which pending books don't have yet).
 */
export async function listPendingBooks(userId: number): Promise<BookRecord[]> {
  const entries = await readAllEntries();
  const now = new Date().toISOString();
  const result: BookRecord[] = [];
  for (const [filename, entry] of Object.entries(entries)) {
    if (entry.syncState !== 'pending' || !entry.pendingPayload) continue;
    const p = entry.pendingPayload;
    result.push({
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
      started_at: now,
      last_read_at: now,
      created_at: now,
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
    });
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

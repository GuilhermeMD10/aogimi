// Push pending books to the backend on web. Mirror of mobile's
// `lib/sync/push.ts`. Callers:
//
//   - `importBook` (in bookStore.ts) — opportunistic push immediately
//     after a local write.
//   - `ReaderView.handleSyncNow` / per-tile sync action — explicit
//     user-triggered push of one or all pending books.

import {
  matchBooks,
  registerBook as apiRegisterBook,
  updateBookIdentity as apiUpdateBookIdentity,
} from '@/lib/booksApi';
import { markBookAvailable } from '@/lib/devicesApi';
import type { BookRecord } from '@/lib/bookStore';
import { listPending, markSynced } from './localState';

export type PushResult =
  | { ok: true; bookId: string }
  | { ok: false; reason: 'network' | 'rejected' };

export type SyncSummary = {
  pushed: string[];
  failed: string[];
};

function candidateFrom(book: BookRecord) {
  return {
    file_hash: book.fileHash ?? '',
    content_hash: book.contentHash ?? null,
    pdf_id_original: book.pdfIdOriginal ?? null,
    xmp_original_id: book.xmpOriginalId ?? null,
    detected_doi: book.detectedDoi ?? null,
    detected_isbn: book.detectedIsbn ?? null,
    page_count: book.pageCount ?? null,
    page_phashes: book.pagePhashes ?? null,
    metadata: {
      title: book.title || book.filename,
      author: book.author,
      dc_identifier: book.dcIdentifier ?? null,
      filename: book.filename,
    },
  };
}

/**
 * Push one book to the backend using its IDB BookRecord. On success:
 * flips the IDB row to `syncState: 'synced'` and flags this device
 * as a source of the file's bytes.
 *
 * Strategy mirrors the +-button import flow:
 *   1. matchBooks — if a `file_hash` match exists, attach (the
 *      AUTO_ATTACH_TYPES rule).
 *   2. Otherwise apiRegisterBook with the row's fields.
 *   3. markBookAvailable so device-books listings know we have it.
 */
export async function pushOneBook(
  book: BookRecord,
  userId: number,
  deviceId: string,
): Promise<PushResult> {
  let bookId: string | null = null;
  try {
    const [matchResult] = await matchBooks(userId, [candidateFrom(book)]);
    // Only the file_hash match type is safe to silently attach to —
    // see AUTO_ATTACH_TYPES in books/locateAndAttachFile.ts.
    if (matchResult?.match && matchResult.match_type === 'file_hash') {
      bookId = matchResult.match.id;
      // Backfill any backend fields the existing row was missing.
      void apiUpdateBookIdentity(bookId, {
        fileHash: book.fileHash ?? null,
        contentHash: book.contentHash ?? null,
        pdfIdOriginal: book.pdfIdOriginal,
        pdfIdCurrent: book.pdfIdCurrent,
        pageCount: book.pageCount,
        hasTextLayer: book.hasTextLayer,
        producer: book.producer,
        xmpDocumentId: book.xmpDocumentId,
        xmpOriginalId: book.xmpOriginalId,
        pageHashes: book.pageHashes,
        textLength: book.textLength,
        detectedDoi: book.detectedDoi,
        detectedIsbn: book.detectedIsbn,
        pagePhashes: book.pagePhashes,
        fingerprintVersion: book.fingerprintVersion,
        dcIdentifier: book.dcIdentifier,
        language: book.language,
        publisher: book.publisher,
      }).catch(() => undefined);
    }
  } catch {
    return { ok: false, reason: 'network' };
  }

  if (!bookId) {
    try {
      const created = await apiRegisterBook({
        userId,
        filename: book.filename,
        title: book.title || book.filename,
        author: book.author,
        coverColor: book.coverColor,
        fileHash: book.fileHash,
        contentHash: book.contentHash,
        pdfIdOriginal: book.pdfIdOriginal,
        pdfIdCurrent: book.pdfIdCurrent,
        pageCount: book.pageCount,
        hasTextLayer: book.hasTextLayer,
        producer: book.producer,
        xmpDocumentId: book.xmpDocumentId,
        xmpOriginalId: book.xmpOriginalId,
        pageHashes: book.pageHashes,
        textLength: book.textLength,
        detectedDoi: book.detectedDoi,
        detectedIsbn: book.detectedIsbn,
        pagePhashes: book.pagePhashes,
        fingerprintVersion: book.fingerprintVersion,
        dcIdentifier: book.dcIdentifier,
        language: book.language,
        publisher: book.publisher,
      });
      bookId = created.id;
    } catch {
      return { ok: false, reason: 'network' };
    }
  }

  markBookAvailable(deviceId, bookId, userId).catch(() => undefined);
  await markSynced(book.filename);
  return { ok: true, bookId };
}

/**
 * Iterate every locally-pending book and push each. Used by the
 * explicit Sync-now button. Sequential — clearer progress reporting.
 */
export async function pushAllPending(
  userId: number,
  deviceId: string,
): Promise<SyncSummary> {
  const pending = await listPending<BookRecord>();
  const summary: SyncSummary = { pushed: [], failed: [] };
  for (const book of pending) {
    const result = await pushOneBook(book, userId, deviceId);
    if (result.ok) {
      summary.pushed.push(book.filename);
    } else {
      summary.failed.push(book.filename);
    }
  }
  return summary;
}

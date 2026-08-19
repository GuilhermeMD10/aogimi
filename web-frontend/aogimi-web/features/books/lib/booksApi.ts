import { apiGet, apiSend, apiSendKeepalive, apiSendVoid } from '@/lib/api';
import type { EpubIdentity } from './epubIdentity';
import type {
  BookProgressRecord,
  MatchCandidate,
  MatchResult,
  ProgressPayload,
} from '@/features/books/types';

// All helpers route through `lib/api` so a 401 with `USER_NOT_FOUND` from
// any books call automatically participates in session invalidation.
// Callers import `* as api from './booksApi'`, and only books-domain calls
// live here.

export async function registerBook(params: {
  userId: number;
  filename: string;
  title: string;
  author: string;
  coverColor: string;
  fileHash?: string;
  contentHash?: string;
  pdfIdOriginal?: string | null;
  pdfIdCurrent?: string | null;
  pageCount?: number | null;
  hasTextLayer?: boolean | null;
  producer?: string | null;
  xmpDocumentId?: string | null;
  xmpOriginalId?: string | null;
  pageHashes?: string[] | null;
  textLength?: number | null;
  detectedDoi?: string | null;
  detectedIsbn?: string | null;
  pagePhashes?: string[] | null;
  fingerprintVersion?: number | null;
  dcIdentifier?: string | null;
  language?: string | null;
  publisher?: string | null;
}): Promise<BookProgressRecord> {
  return apiSend<BookProgressRecord>('/api/books', 'POST', params);
}

export async function getUserBooks(
  userId: number,
  signal?: AbortSignal,
): Promise<BookProgressRecord[]> {
  return apiGet<BookProgressRecord[]>(`/api/books/user/${userId}`, signal);
}

export async function getBookRecord(id: string): Promise<BookProgressRecord> {
  return apiGet<BookProgressRecord>(`/api/books/${id}`);
}

/**
 * Update a book's stored progress (reading position + percent). Used by the
 * reader's periodic / on-unmount flush and by the explicit "mark finished"
 * action (`{ progress: 100 }`). The backend COALESCEs omitted fields, so a
 * partial payload preserves the rest of the row.
 */
export async function updateBookProgress(
  id: string,
  params: ProgressPayload,
): Promise<BookProgressRecord> {
  return apiSend<BookProgressRecord>(`/api/books/${id}/progress`, 'PUT', params);
}

/**
 * Exit-path variant of {@link updateBookProgress}: a keepalive POST that
 * survives tab close / app backgrounding. Fire-and-forget — see
 * `apiSendKeepalive`. Returns whether the request was fired (false when there
 * was no in-memory token to authenticate with).
 */
export function sendProgressKeepalive(id: string, params: ProgressPayload): boolean {
  return apiSendKeepalive(`/api/books/${id}/progress`, params);
}

export async function deleteBookRecord(id: string): Promise<void> {
  return apiSendVoid(`/api/books/${id}`, 'DELETE');
}

export async function updateBookTitle(
  id: string,
  title: string,
): Promise<BookProgressRecord> {
  return apiSend<BookProgressRecord>(`/api/books/${id}`, 'PATCH', { title });
}

export async function matchBooks(
  userId: number,
  books: MatchCandidate[],
): Promise<(MatchResult | null)[]> {
  return apiSend<(MatchResult | null)[]>('/api/books/match', 'POST', { userId, books });
}

/** Identity payload accepted by the backend's PUT /api/books/:id/identity.
 *  Supports both EPUB-derived identity (file_hash + content_hash + dc_*)
 *  and PDF-derived identity (file_hash + pdf_id_original + pdf_id_current).
 *  Null fields are sent through unchanged so the backend's COALESCE-based
 *  update preserves existing values rather than blanking them. */
export type BookIdentityPayload = {
  fileHash: string | null;
  contentHash: string | null;
  pdfIdOriginal?: string | null;
  pdfIdCurrent?: string | null;
  pageCount?: number | null;
  hasTextLayer?: boolean | null;
  producer?: string | null;
  xmpDocumentId?: string | null;
  xmpOriginalId?: string | null;
  pageHashes?: string[] | null;
  textLength?: number | null;
  detectedDoi?: string | null;
  detectedIsbn?: string | null;
  pagePhashes?: string[] | null;
  fingerprintVersion?: number | null;
  dcIdentifier?: string | null;
  language?: string | null;
  publisher?: string | null;
};

export async function updateBookIdentity(
  id: string,
  identity: EpubIdentity | BookIdentityPayload,
): Promise<BookProgressRecord> {
  return apiSend<BookProgressRecord>(`/api/books/${id}/identity`, 'PUT', identity);
}

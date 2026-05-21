import { API_URL } from './api';
import type { EpubIdentity } from '@/lib/epubIdentity';
import type {
  BookProgressRecord,
  MatchCandidate,
  MatchResult,
  ProgressPayload,
} from '@/lib/types';

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
  const res = await fetch(`${API_URL}/api/books`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'Failed to register book');
  return res.json();
}

export async function getUserBooks(userId: number, signal?: AbortSignal): Promise<BookProgressRecord[]> {
  const res = await fetch(`${API_URL}/api/books/user/${userId}`, { signal });
  if (!res.ok) throw new Error('Failed to fetch books');
  return res.json();
}

export async function getBookRecord(id: string): Promise<BookProgressRecord> {
  const res = await fetch(`${API_URL}/api/books/${id}`);
  if (!res.ok) throw new Error('Book not found');
  return res.json();
}

export async function updateBookProgress(
  id: string,
  params: ProgressPayload,
): Promise<BookProgressRecord> {
  const res = await fetch(`${API_URL}/api/books/${id}/progress`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error('Failed to update progress');
  return res.json();
}

/**
 * Fire-and-forget progress sync via sendBeacon.
 * Survives page unload / tab close — browser guarantees delivery.
 */
export function sendProgressBeacon(id: string, params: ProgressPayload): void {
  const url = `${API_URL}/api/books/${id}/progress`;
  const body = new Blob([JSON.stringify(params)], { type: 'application/json' });
  navigator.sendBeacon(url, body);
}

export async function deleteBookRecord(id: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/books/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete book');
}

export async function updateBookTitle(
  id: string,
  title: string,
): Promise<BookProgressRecord> {
  const res = await fetch(`${API_URL}/api/books/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title }),
  });
  if (!res.ok) throw new Error('Failed to update book title');
  return res.json();
}

export async function matchBooks(
  userId: number,
  books: MatchCandidate[],
): Promise<(MatchResult | null)[]> {
  const res = await fetch(`${API_URL}/api/books/match`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, books }),
  });
  if (!res.ok) throw new Error('Failed to match books');
  return res.json();
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
  const res = await fetch(`${API_URL}/api/books/${id}/identity`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(identity),
  });
  if (!res.ok) throw new Error('Failed to update book identity');
  return res.json();
}

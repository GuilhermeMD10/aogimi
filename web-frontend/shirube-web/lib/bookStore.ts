import { openDB, type IDBPDatabase } from 'idb';
import {
  registerBook as apiRegisterBook,
  getUserBooks,
  updateBookIdentity as apiUpdateBookIdentity,
  updateBookTitle as apiUpdateBookTitle,
} from '@/lib/booksApi';
import type { BookProgressRecord } from '@/lib/types';
import { computeEpubIdentity, extractEpubData, type EpubData } from '@/lib/epubIdentity';

// ── Types ────────────────────────────────────────────────────────────────────

export interface BookRecord {
  /** Key — filename for now, UUID later */
  id: string;
  title: string;
  author: string;
  filename: string;
  /** Hex color for default cover gradient */
  coverColor: string;
  /** Whether the EPUB contained a real cover image */
  hasCover: boolean;
  /** Base64-encoded cover image (if extracted) */
  coverImage?: string;
  importedAt: string;
  fileSize: number;
  /** SHA-256 of full EPUB bytes */
  fileHash?: string;
  /** SHA-256 of concatenated spine text */
  contentHash?: string;
  /** OPF dc:identifier (often ISBN) */
  dcIdentifier?: string | null;
  /** OPF dc:language */
  language?: string | null;
  /** OPF dc:publisher */
  publisher?: string | null;
}

// ── Constants ────────────────────────────────────────────────────────────────

const DB_NAME = 'shirube-books';
const DB_VERSION = 1;
const META_STORE = 'metadata';
const FILES_STORE = 'files';

/** Fallback cover colors assigned round-robin on import */
const COVER_PALETTE = [
  '#6B5A45', '#2E5D4E', '#8E3B36', '#263B5C',
  '#4A4038', '#7A5330', '#3B5249', '#5C4033',
];

// ── DB init ──────────────────────────────────────────────────────────────────

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(META_STORE)) {
          db.createObjectStore(META_STORE, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(FILES_STORE)) {
          db.createObjectStore(FILES_STORE);
        }
      },
    });
  }
  return dbPromise;
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Import an EPUB file: extracts metadata + identity hashes, stores file + record
 * in IndexedDB. If userId is provided, also registers the book with the backend.
 */
export async function importBook(
  file: File,
  userId?: number,
): Promise<BookRecord> {
  const arrayBuffer = await file.arrayBuffer();

  // Single jszip-based pass — metadata, identity hashes, and cover in one go
  const data: EpubData | null = await extractEpubData(arrayBuffer).catch(() => null);

  const db = await getDb();

  // Assign a cover color from the palette based on current book count
  const existingCount = await db.count(META_STORE);
  const coverColor = COVER_PALETTE[existingCount % COVER_PALETTE.length];

  const title = data?.title ?? 'Untitled';
  const author = data?.creator ?? 'Unknown author';

  const record: BookRecord = {
    id: file.name,
    title,
    author,
    filename: file.name,
    coverColor,
    hasCover: !!data?.coverImage,
    coverImage: data?.coverImage,
    importedAt: new Date().toISOString(),
    fileSize: file.size,
    fileHash: data?.fileHash,
    contentHash: data?.contentHash,
    dcIdentifier: data?.dcIdentifier,
    language: data?.language,
    publisher: data?.publisher,
  };

  const tx = db.transaction([META_STORE, FILES_STORE], 'readwrite');
  await Promise.all([
    tx.objectStore(META_STORE).put(record),
    tx.objectStore(FILES_STORE).put(arrayBuffer, record.id),
    tx.done,
  ]);

  // Register with backend — the service returns existing record on duplicate
  if (userId != null) {
    await apiRegisterBook({
      userId,
      filename: file.name,
      title,
      author,
      coverColor,
      fileHash: data?.fileHash,
      contentHash: data?.contentHash,
      dcIdentifier: data?.dcIdentifier,
      language: data?.language,
      publisher: data?.publisher,
    });
  }

  return record;
}

/**
 * Ensure a specific book has a backend record. Returns the backend UUID.
 * Safe to call multiple times — backend returns existing record on duplicate.
 */
export async function ensureBackendBook(
  book: BookRecord,
  userId: number,
): Promise<BookProgressRecord> {
  return apiRegisterBook({
    userId,
    filename: book.filename,
    title: book.title,
    author: book.author,
    coverColor: book.coverColor,
    fileHash: book.fileHash,
    contentHash: book.contentHash,
    dcIdentifier: book.dcIdentifier,
    language: book.language,
    publisher: book.publisher,
  });
}

/**
 * Sync all local IndexedDB books to the backend for the given user.
 * Returns a map of filename → backend BookProgressRecord.
 * Best-effort: books that fail to register are skipped.
 */
export async function syncLocalBooksToBackend(
  userId: number,
): Promise<Map<string, BookProgressRecord>> {
  const [localBooks, remoteBooks] = await Promise.all([
    getAllBooks(),
    getUserBooks(userId),
  ]);

  const remoteMap = new Map<string, BookProgressRecord>();
  for (const r of remoteBooks) remoteMap.set(r.filename, r);

  // Register any local books not yet in the backend
  for (const local of localBooks) {
    if (remoteMap.has(local.filename)) continue;
    try {
      const registered = await apiRegisterBook({
        userId,
        filename: local.filename,
        title: local.title,
        author: local.author,
        coverColor: local.coverColor,
        fileHash: local.fileHash,
        contentHash: local.contentHash,
        dcIdentifier: local.dcIdentifier,
        language: local.language,
        publisher: local.publisher,
      });
      remoteMap.set(registered.filename, registered);
    } catch {
      // Skip this book — will retry next time
    }
  }

  return remoteMap;
}

/**
 * Backfill identity hashes for a book that was imported before hash support.
 * Computes hashes from the IndexedDB file and updates both local record and backend.
 */
export async function backfillBookIdentity(
  bookId: string,
  backendBookId: string,
): Promise<void> {
  const record = await getBook(bookId);
  if (!record || record.fileHash) return; // Already has hashes

  const arrayBuffer = await getBookFile(bookId);
  if (!arrayBuffer) return;

  const identity = await computeEpubIdentity(arrayBuffer);

  // Update local IndexedDB record
  const db = await getDb();
  const updated: BookRecord = {
    ...record,
    fileHash: identity.fileHash,
    contentHash: identity.contentHash,
    dcIdentifier: identity.dcIdentifier,
    language: identity.language,
    publisher: identity.publisher,
  };
  await db.put(META_STORE, updated);

  // Update backend
  await apiUpdateBookIdentity(backendBookId, identity);
}

/**
 * Rename a book's display title. Updates the local IndexedDB record and, if a
 * backend UUID is provided, the corresponding `book_progress` row. The local
 * record id (filename) and identity hashes are untouched, so the file blob,
 * reading progress and cross-device matching all remain intact.
 */
export async function renameBook(
  id: string,
  title: string,
  backendId?: string,
): Promise<BookRecord | undefined> {
  const trimmed = title.trim();
  if (!trimmed) return undefined;

  const db = await getDb();
  const record = await db.get(META_STORE, id) as BookRecord | undefined;
  if (!record) return undefined;
  if (record.title === trimmed) return record;

  const updated: BookRecord = { ...record, title: trimmed };
  await db.put(META_STORE, updated);

  if (backendId) {
    await apiUpdateBookTitle(backendId, trimmed).catch(() => { /* best-effort */ });
  }

  return updated;
}

/** Get all book metadata records (no file data). */
export async function getAllBooks(): Promise<BookRecord[]> {
  const db = await getDb();
  return db.getAll(META_STORE);
}

/** Get a single book's metadata. */
export async function getBook(id: string): Promise<BookRecord | undefined> {
  const db = await getDb();
  return db.get(META_STORE, id);
}

/** Retrieve the EPUB file as an ArrayBuffer. */
export async function getBookFile(id: string): Promise<ArrayBuffer | undefined> {
  const db = await getDb();
  return db.get(FILES_STORE, id);
}

/** Delete a book and its file from IndexedDB. */
export async function deleteBook(id: string): Promise<void> {
  const db = await getDb();
  const tx = db.transaction([META_STORE, FILES_STORE], 'readwrite');
  await Promise.all([
    tx.objectStore(META_STORE).delete(id),
    tx.objectStore(FILES_STORE).delete(id),
    tx.done,
  ]);
}

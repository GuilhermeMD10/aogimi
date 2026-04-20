import { openDB, type IDBPDatabase } from 'idb';
import {
  registerBook as apiRegisterBook,
  getUserBooks,
  type BookProgressRecord,
} from '@/lib/booksApi';

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
}

// ── Constants ────────────────────────────────────────────────────────────────

const DB_NAME = 'langeco-books';
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

// ── Metadata extraction via epubjs ───────────────────────────────────────────

async function extractEpubMetadata(
  arrayBuffer: ArrayBuffer,
): Promise<{ title: string; author: string; coverImage?: string }> {
  const mod = await import('epubjs');
  const createBook = mod.default as unknown as (data: ArrayBuffer) => {
    loaded: { metadata: Promise<{ title: string; creator: string }> };
    coverUrl: () => Promise<string | null>;
    destroy: () => void;
  };

  const book = createBook(arrayBuffer);
  try {
    const metadata = await book.loaded.metadata;
    let coverImage: string | undefined;

    try {
      const coverUrl = await book.coverUrl();
      if (coverUrl) {
        const res = await fetch(coverUrl);
        const blob = await res.blob();
        coverImage = await blobToBase64(blob);
      }
    } catch {
      // Cover extraction is best-effort
    }

    return {
      title: metadata.title || 'Untitled',
      author: metadata.creator || 'Unknown author',
      coverImage,
    };
  } finally {
    try { book.destroy(); } catch { /* no rendition to tear down */ }
  }
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Import an EPUB file: extracts metadata, stores file + record in IndexedDB.
 * If userId is provided, also registers the book with the backend (throws on failure).
 */
export async function importBook(
  file: File,
  userId?: number,
): Promise<BookRecord> {
  const arrayBuffer = await file.arrayBuffer();
  const { title, author, coverImage } = await extractEpubMetadata(arrayBuffer);

  const db = await getDb();

  // Assign a cover color from the palette based on current book count
  const existingCount = await db.count(META_STORE);
  const coverColor = COVER_PALETTE[existingCount % COVER_PALETTE.length];

  const record: BookRecord = {
    id: file.name,
    title,
    author,
    filename: file.name,
    coverColor,
    hasCover: !!coverImage,
    coverImage,
    importedAt: new Date().toISOString(),
    fileSize: file.size,
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
      });
      remoteMap.set(registered.filename, registered);
    } catch {
      // Skip this book — will retry next time
    }
  }

  return remoteMap;
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

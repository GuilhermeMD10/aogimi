import { getDb, META_STORE, FILES_STORE } from './booksDb';
export { wipeBookDatabase } from './booksDb';
import {
  registerBook as apiRegisterBook,
  getUserBooks,
  updateBookIdentity as apiUpdateBookIdentity,
  updateBookTitle as apiUpdateBookTitle,
} from './booksApi';
import type { BookProgressRecord } from '@/lib/types';
import { computeEpubIdentity, extractEpubData, type EpubData } from '@/lib/epubIdentity';
import { computePdfIdentity, extractPdfData } from '@/lib/pdfIdentity';

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
  /** SHA-256 of full file bytes (both formats) */
  fileHash?: string;
  /** EPUB: SHA-256 of concatenated spine text. PDF: unused after phase 1
   *  (reserved for the text-content-hash use case in a later phase). */
  contentHash?: string;
  /** PDF /ID[0] — stable across modifications. EPUB-side unused. */
  pdfIdOriginal?: string | null;
  /** PDF /ID[1] — changes on each save. EPUB-side unused. */
  pdfIdCurrent?: string | null;
  /** PDF page count. EPUB-side unused. */
  pageCount?: number | null;
  /** PDF: true when the document has an extractable text layer. */
  hasTextLayer?: boolean | null;
  /** PDF /Info /Producer. Diagnostic only. */
  producer?: string | null;
  /** xmpMM:DocumentID — changes on save-as. Forensics only. */
  xmpDocumentId?: string | null;
  /** xmpMM:OriginalDocumentID — stable across re-saves of the same source. */
  xmpOriginalId?: string | null;
  /** PDF: per-page SHA-256 of normalized text. */
  pageHashes?: string[] | null;
  /** PDF: character count of normalized full text. */
  textLength?: number | null;
  /** PDF: DOI scraped from front-matter. */
  detectedDoi?: string | null;
  /** PDF: ISBN-10/13 scraped + checksum-validated. */
  detectedIsbn?: string | null;
  /** PDF: per-sampled-page dHash array. Visual match layer input. */
  pagePhashes?: string[] | null;
  /** Version of the algorithm that produced this record's fingerprints. */
  fingerprintVersion?: number;
  /** OPF dc:identifier (often ISBN) */
  dcIdentifier?: string | null;
  /** OPF dc:language */
  language?: string | null;
  /** OPF dc:publisher */
  publisher?: string | null;
  /** Sync state: 'synced' = backend has this book and we've confirmed
   *  it; 'pending' = local-only, awaiting a push to the backend (Sync-
   *  now button or per-tile sync action). Absent on legacy rows is
   *  treated as 'synced' — they came from imports that successfully
   *  pushed before this marker existed. See `lib/sync/`. */
  syncState?: 'synced' | 'pending';
}

// ── Constants ────────────────────────────────────────────────────────────────

/** Fallback cover colors assigned round-robin on import */
const COVER_PALETTE = [
  '#6B5A45', '#2E5D4E', '#8E3B36', '#263B5C',
  '#4A4038', '#7A5330', '#3B5249', '#5C4033',
];

// ── Storage durability ───────────────────────────────────────────────────────

let persistRequested = false;

/**
 * Ask the browser to mark this origin's storage as persistent. Without
 * this, IDB is "best-effort" and can be silently evicted under disk
 * pressure — a user with a heavy library could find their books gone
 * after a low-disk warning. Chrome auto-grants based on engagement
 * heuristics; Firefox prompts; Safari ignores. Idempotent and noisy-
 * fail-safe (no throws).
 */
async function requestPersistentStorage(): Promise<void> {
  if (persistRequested) return;
  persistRequested = true;
  try {
    if (typeof navigator === 'undefined' || !navigator.storage?.persist) return;
    if (await navigator.storage.persisted()) return;
    await navigator.storage.persist();
  } catch {
    /* feature absent or denied — fine, we just stay best-effort */
  }
}

// ── Public API ───────────────────────────────────────────────────────────────

export type ImportBookOutcome = {
  record: BookRecord;
  /** True when an IDB record already existed under this filename AND its
   *  fileHash matched the new file's fileHash — i.e. the user re-imported
   *  the exact same bytes. UI uses this to surface a "already in your
   *  library" hint instead of treating it as a fresh import. */
  wasAlreadyPresentSameBytes: boolean;
};

/**
 * Import an EPUB file: extracts metadata + identity hashes, stores file + record
 * in IndexedDB. If userId is provided, also registers the book with the backend.
 *
 * Returns the new BookRecord plus a `wasAlreadyPresentSameBytes` flag so
 * callers can show the user a "you already have this" hint instead of
 * silently no-op'ing on a duplicate pick.
 */
export async function importBook(
  file: File,
  userId?: number,
): Promise<ImportBookOutcome> {
  const arrayBuffer = await file.arrayBuffer();
  const isPdf = file.name.toLowerCase().endsWith('.pdf');

  // Branch by file type. EPUB path uses the jszip OPF extractor; PDF path
  // uses pdf.js for title + first-page cover. Both fall back gracefully.
  let title = 'Untitled';
  let author = 'Unknown author';
  let coverImage: string | undefined;
  let hasCover = false;
  let fileHash: string | undefined;
  let contentHash: string | undefined;
  let pdfIdOriginal: string | null | undefined;
  let pdfIdCurrent: string | null | undefined;
  let pageCount: number | null | undefined;
  let hasTextLayer: boolean | null | undefined;
  let producer: string | null | undefined;
  let xmpDocumentId: string | null | undefined;
  let xmpOriginalId: string | null | undefined;
  let pageHashes: string[] | null | undefined;
  let textLength: number | null | undefined;
  let detectedDoi: string | null | undefined;
  let detectedIsbn: string | null | undefined;
  let pagePhashes: string[] | null | undefined;
  let fingerprintVersion: number | undefined;
  let dcIdentifier: string | undefined;
  let language: string | undefined;
  let publisher: string | undefined;

  if (isPdf) {
    const pdf = await extractPdfData(arrayBuffer).catch(() => null);
    if (pdf?.title) title = pdf.title;
    if (pdf?.coverImage) {
      coverImage = pdf.coverImage;
      hasCover = true;
    }
    if (pdf?.fileHash) fileHash = pdf.fileHash;
    if (pdf?.contentHash) contentHash = pdf.contentHash;
    pdfIdOriginal = pdf?.pdfIdOriginal ?? null;
    pdfIdCurrent = pdf?.pdfIdCurrent ?? null;
    pageCount = pdf?.pageCount ?? null;
    hasTextLayer = pdf?.hasTextLayer ?? null;
    producer = pdf?.producer ?? null;
    xmpDocumentId = pdf?.xmpDocumentId ?? null;
    xmpOriginalId = pdf?.xmpOriginalId ?? null;
    pageHashes = pdf?.pageHashes ?? null;
    textLength = pdf?.textLength ?? null;
    detectedDoi = pdf?.detectedDoi ?? null;
    detectedIsbn = pdf?.detectedIsbn ?? null;
    pagePhashes = pdf?.pagePhashes ?? null;
    if (pdf?.fingerprintVersion != null) fingerprintVersion = pdf.fingerprintVersion;
  } else {
    // Single jszip-based pass — metadata, identity hashes, and cover in one go
    const data: EpubData | null = await extractEpubData(arrayBuffer).catch(() => null);
    if (data?.title) title = data.title;
    if (data?.creator) author = data.creator;
    if (data?.coverImage) {
      coverImage = data.coverImage;
      hasCover = true;
    }
    // EpubData fields are `string | null`; coerce nulls to undefined so the
    // BookRecord (string | undefined) typing accepts them.
    fileHash = data?.fileHash ?? undefined;
    contentHash = data?.contentHash ?? undefined;
    dcIdentifier = data?.dcIdentifier ?? undefined;
    language = data?.language ?? undefined;
    publisher = data?.publisher ?? undefined;
    if (data?.fingerprintVersion != null) fingerprintVersion = data.fingerprintVersion;
  }

  const db = await getDb();

  // Defensive re-import guard: if an existing record under this filename
  // has a different file_hash, the new bytes are NOT the same book — drop
  // the per-filename local state (highlights, bookmarks, lastCfi,
  // reader_progress) so it doesn't silently attach to the new content.
  // The only "same file" guarantee we accept is matching file_hash;
  // anything weaker (content/metadata strong-match the matcher uses for
  // backend attachment) is still treated as "different file" here
  // because reader state lives at byte-offset granularity (CFI ranges,
  // PDF page positions) and won't map cleanly across re-saves.
  const existingRecord = (await db.get(META_STORE, file.name)) as BookRecord | undefined;
  const sameBytes = Boolean(
    existingRecord?.fileHash && fileHash && existingRecord.fileHash === fileHash,
  );
  if (existingRecord && !sameBytes) {
    // Same filename, different bytes. The new file_blob will overwrite
    // the existing entry (same primary key) via the transaction below.
    // Warn so a debug session can see that a stealth replace happened.
    console.warn(
      `[bookStore] filename collision: replacing "${file.name}" (different file_hash)`,
    );
  }

  // Assign a cover color from the palette based on current book count.
  // Preserve the existing color on a same-bytes re-import so the user's
  // library doesn't shuffle colors when nothing meaningful changed.
  const existingCount = await db.count(META_STORE);
  const coverColor = sameBytes && existingRecord?.coverColor
    ? existingRecord.coverColor
    : COVER_PALETTE[existingCount % COVER_PALETTE.length];

  // Initial sync state is 'pending' — the local write is the source
  // of truth until the backend push below confirms otherwise. If userId
  // is null (unauthed import, signed-out), the
  // book stays pending forever from the local IDB's point of view;
  // that's fine because the unauthed path doesn't use sync.
  const record: BookRecord = {
    id: file.name,
    title,
    author,
    filename: file.name,
    coverColor,
    hasCover,
    coverImage,
    importedAt: new Date().toISOString(),
    fileSize: file.size,
    fileHash,
    contentHash,
    pdfIdOriginal,
    pdfIdCurrent,
    pageCount,
    hasTextLayer,
    producer,
    xmpDocumentId,
    xmpOriginalId,
    pageHashes,
    textLength,
    detectedDoi,
    detectedIsbn,
    pagePhashes,
    fingerprintVersion,
    dcIdentifier,
    language,
    publisher,
    syncState: 'pending',
  };

  const tx = db.transaction([META_STORE, FILES_STORE], 'readwrite');
  // Await the puts first so a rejection surfaces the actual write error
  // (e.g. quota exceeded). Including tx.done in the same Promise.all
  // race meant tx's deferred-abort could win and mask the real cause.
  await Promise.all([
    tx.objectStore(META_STORE).put(record),
    tx.objectStore(FILES_STORE).put(arrayBuffer, record.id),
  ]);
  await tx.done;

  // Ask the browser to make our IDB storage durable so it isn't silently
  // evicted under disk pressure. Idempotent — if already granted, this
  // resolves immediately. Tied to the import call site because that's
  // the first time the user has demonstrated intent (gestures only).
  void requestPersistentStorage();

  // Register with backend — opportunistic push. On success, flip the
  // IDB row to 'synced'. On failure (offline / 5xx / etc.), leave as
  // 'pending' — the user can later push via Sync-now or the per-tile
  // sync badge.
  if (userId != null) {
    try {
      await apiRegisterBook({
        userId,
        filename: file.name,
        title,
        author,
        coverColor,
        fileHash,
        contentHash,
        pdfIdOriginal,
        pdfIdCurrent,
        pageCount,
        hasTextLayer,
        producer,
        xmpDocumentId,
        xmpOriginalId,
        pageHashes,
        textLength,
        detectedDoi,
        detectedIsbn,
        pagePhashes,
        fingerprintVersion,
        dcIdentifier,
        language,
        publisher,
      });
      record.syncState = 'synced';
      await db.put(META_STORE, record);
    } catch {
      // Stays pending. Caller's UI can detect via the returned record.
    }
  }

  return { record, wasAlreadyPresentSameBytes: sameBytes };
}

/**
 * Ensure a specific book has a backend record. Returns the backend UUID.
 * Safe to call multiple times — backend returns existing record on duplicate.
 */
export async function ensureBackendBook(
  book: BookRecord,
  userId: number,
): Promise<BookProgressRecord> {
  // Phase 1 migration aid: pre-phase-1 PDF IDB rows stored /ID[0] in
  // `contentHash`. Route it to `pdfIdOriginal` on the way to the backend so
  // older IDB rows backfill the new column without forcing a re-import.
  const isPdf = book.filename.toLowerCase().endsWith('.pdf');
  const legacyPdfId = isPdf && !book.pdfIdOriginal ? book.contentHash : undefined;
  return apiRegisterBook({
    userId,
    filename: book.filename,
    title: book.title,
    author: book.author,
    coverColor: book.coverColor,
    fileHash: book.fileHash,
    // PDF contentHash *was* the legacy /ID home pre-mig-016. Post-phase-3
    // it's the text SHA. Discriminate: if the stored value looks like a
    // text-SHA (PDF + 64-char hex AND we have pdfIdOriginal already, i.e.
    // this isn't a legacy migration), send it. Otherwise treat the field
    // as legacy and skip for PDFs.
    contentHash: isPdf
      ? (book.pdfIdOriginal && book.contentHash && book.contentHash.length === 64
          ? book.contentHash
          : undefined)
      : book.contentHash,
    pdfIdOriginal: book.pdfIdOriginal ?? legacyPdfId,
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
    // Phase 1 migration aid: pre-phase-1 PDF IDB rows stored /ID[0] in
    // `contentHash`. Route it to `pdfIdOriginal` so older rows backfill
    // the new column on first sync.
    const isPdf = local.filename.toLowerCase().endsWith('.pdf');
    const legacyPdfId = isPdf && !local.pdfIdOriginal ? local.contentHash : undefined;
    try {
      const registered = await apiRegisterBook({
        userId,
        filename: local.filename,
        title: local.title,
        author: local.author,
        coverColor: local.coverColor,
        fileHash: local.fileHash,
        // See ensureBackendBook for the contentHash discriminator rationale.
        contentHash: isPdf
          ? (local.pdfIdOriginal && local.contentHash && local.contentHash.length === 64
              ? local.contentHash
              : undefined)
          : local.contentHash,
        pdfIdOriginal: local.pdfIdOriginal ?? legacyPdfId,
        pdfIdCurrent: local.pdfIdCurrent,
        pageCount: local.pageCount,
        hasTextLayer: local.hasTextLayer,
        producer: local.producer,
        xmpDocumentId: local.xmpDocumentId,
        xmpOriginalId: local.xmpOriginalId,
        pageHashes: local.pageHashes,
        textLength: local.textLength,
        detectedDoi: local.detectedDoi,
        detectedIsbn: local.detectedIsbn,
        pagePhashes: local.pagePhashes,
        fingerprintVersion: local.fingerprintVersion,
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

  // Branch by file type. PDFs populate file_hash + pdf_id_original/current
  // + page_count/has_text_layer/producer/xmp_* + text-derived fields;
  // EPUBs populate file_hash + content_hash + dc_identifier/language/publisher.
  const isPdf = record.filename.toLowerCase().endsWith('.pdf');
  let fileHash: string | null = null;
  let contentHash: string | null = null;
  let pdfIdOriginal: string | null = null;
  let pdfIdCurrent: string | null = null;
  let pageCount: number | null = null;
  let hasTextLayer: boolean | null = null;
  let producer: string | null = null;
  let xmpDocumentId: string | null = null;
  let xmpOriginalId: string | null = null;
  let pageHashes: string[] | null = null;
  let textLength: number | null = null;
  let detectedDoi: string | null = null;
  let detectedIsbn: string | null = null;
  let pagePhashes: string[] | null = null;
  let fingerprintVersion: number | null = null;
  let dcIdentifier: string | null = null;
  let language: string | null = null;
  let publisher: string | null = null;

  if (isPdf) {
    const id = await computePdfIdentity(arrayBuffer);
    fileHash = id.fileHash;
    contentHash = id.contentHash;
    pdfIdOriginal = id.pdfIdOriginal;
    pdfIdCurrent = id.pdfIdCurrent;
    pageCount = id.pageCount;
    hasTextLayer = id.hasTextLayer;
    producer = id.producer;
    xmpDocumentId = id.xmpDocumentId;
    xmpOriginalId = id.xmpOriginalId;
    pageHashes = id.pageHashes;
    textLength = id.textLength;
    detectedDoi = id.detectedDoi;
    detectedIsbn = id.detectedIsbn;
    pagePhashes = id.pagePhashes;
    fingerprintVersion = id.fingerprintVersion;
  } else {
    const id = await computeEpubIdentity(arrayBuffer);
    fileHash = id.fileHash;
    contentHash = id.contentHash;
    dcIdentifier = id.dcIdentifier;
    language = id.language;
    publisher = id.publisher;
    fingerprintVersion = id.fingerprintVersion;
  }

  // Update local IndexedDB record
  const db = await getDb();
  const updated: BookRecord = {
    ...record,
    fileHash: fileHash ?? undefined,
    contentHash: contentHash ?? undefined,
    pdfIdOriginal: pdfIdOriginal ?? undefined,
    pdfIdCurrent: pdfIdCurrent ?? undefined,
    pageCount: pageCount ?? undefined,
    hasTextLayer: hasTextLayer ?? undefined,
    producer: producer ?? undefined,
    xmpDocumentId: xmpDocumentId ?? undefined,
    xmpOriginalId: xmpOriginalId ?? undefined,
    pageHashes: pageHashes ?? undefined,
    textLength: textLength ?? undefined,
    detectedDoi: detectedDoi ?? undefined,
    detectedIsbn: detectedIsbn ?? undefined,
    pagePhashes: pagePhashes ?? undefined,
    fingerprintVersion: fingerprintVersion ?? undefined,
    dcIdentifier: dcIdentifier ?? undefined,
    language: language ?? undefined,
    publisher: publisher ?? undefined,
  };
  await db.put(META_STORE, updated);

  // Update backend. Null fields are preserved by the backend's COALESCE so
  // existing rows don't get blanked when (e.g.) a PDF has no dc_identifier.
  await apiUpdateBookIdentity(backendBookId, {
    fileHash,
    contentHash,
    pdfIdOriginal,
    pdfIdCurrent,
    pageCount,
    hasTextLayer,
    producer,
    xmpDocumentId,
    xmpOriginalId,
    pageHashes,
    textLength,
    detectedDoi,
    detectedIsbn,
    pagePhashes,
    fingerprintVersion,
    dcIdentifier,
    language,
    publisher,
  });
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
  ]);
  await tx.done;
}

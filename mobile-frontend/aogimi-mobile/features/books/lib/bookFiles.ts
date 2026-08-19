import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { wipeBookLocalState } from '@/features/books/lib/wipeBookLocalState';
import { booksDir } from './bookPaths';
import { sha256Hex } from './fingerprint/hash';
import { FINGERPRINT_VERSION } from './fingerprint/version';
import { getStoredFileHash, setStoredFileHash } from './bookLocalState';

// Path / existence helpers + the destructive `deleteBookFile` /
// `wipeAllBookFiles` / `listLocalBookFilenames` exports live in
// `./bookPaths` so consumers that just need to *read* book paths don't
// pull this module's import-flow side. Keeps the dependency graph acyclic.

export type ImportedBook = {
  filename: string;
  title: string;
  author: string;
  /** SHA-256 of raw file bytes. Primary cross-device match key (both formats). */
  fileHash: string | null;
  /** EPUB only: SHA-256 of concatenated spine text. Null for PDFs. */
  contentHash: string | null;
  /** PDF only: /ID[0] from trailer — stable across modifications. Null for EPUBs. */
  pdfIdOriginal: string | null;
  /** PDF only: /ID[1] from trailer — changes on save. Null for EPUBs. */
  pdfIdCurrent: string | null;
  /** PDF only: total page count. Null on mobile — no native PDF parser. */
  pageCount: number | null;
  /** PDF only: extractable text layer present. Null on mobile. */
  hasTextLayer: boolean | null;
  /** PDF only: /Producer from /Info. Diagnostic — not used in matching. */
  producer: string | null;
  /** PDF only: xmpMM:DocumentID. Forensics — not used in matching. */
  xmpDocumentId: string | null;
  /** PDF only: xmpMM:OriginalDocumentID. Strong cross-device match key. */
  xmpOriginalId: string | null;
  /** PDF only: per-page SHA-256 of normalized text. Mobile leaves null. */
  pageHashes: string[] | null;
  /** PDF only: normalized text char count. Mobile leaves null. */
  textLength: number | null;
  /** PDF only: scraped DOI. Mobile leaves null (no text extractor). */
  detectedDoi: string | null;
  /** PDF only: validated ISBN. Mobile leaves null (no text extractor). */
  detectedIsbn: string | null;
  /** PDF only: per-sampled-page dHash array. Mobile leaves null (no native
   *  render-to-grayscale pipeline). Web populates. */
  pagePhashes: string[] | null;
  /** Version of the algorithm that produced these fields. Sent to the
   *  backend on create / identity update so each row records which
   *  algorithm shaped it. */
  fingerprintVersion: number;
  /** EPUB only: <dc:identifier> from content.opf. */
  dcIdentifier: string | null;
  /** EPUB only: <dc:language>. */
  language: string | null;
  /** EPUB only: <dc:publisher>. */
  publisher: string | null;
  uri: string;
  /** True when an on-disk file already existed under this filename AND
   *  its stored fileHash matched the new file's fileHash — i.e. the user
   *  re-imported the exact same bytes. UI surfaces this as a "you already
   *  have this book" hint instead of silently no-op'ing. */
  wasAlreadyPresentSameBytes: boolean;
};

/**
 * Thrown by `importEpub` when called with `opts.expectedFilename` and the
 * user picks a file whose extension doesn't match. Catch in the locate
 * flows to show a clear "wrong file type" alert instead of running the
 * full identity / match pipeline only to fail at the end.
 */
export class ExtensionMismatchError extends Error {
  constructor(public picked: string, public expected: string) {
    super(
      `Picked .${picked || '<none>'} but expected .${expected || '<none>'}`,
    );
    this.name = 'ExtensionMismatchError';
  }
}

function extOf(filename: string): string {
  const dot = filename.lastIndexOf('.');
  return dot >= 0 ? filename.slice(dot + 1).toLowerCase() : '';
}

/**
 * Prompt the user to pick an EPUB/PDF, copy it into the app's documents dir,
 * and return the stored filename + suggested metadata + identity hashes.
 *
 * The filename returned is the original file name from the picker. If a file
 * with the same name already exists locally, it is overwritten — the unique
 * constraint on (user_id, filename) in book_progress keeps the backend clean.
 *
 * Identity hashes are populated best-effort: a failed probe returns nulls.
 * Callers (HomeScreen) feed them into POST /api/books/match to detect when
 * the same content is already on another device.
 *
 * @param opts.expectedFilename When set (locate flow), the picked file's
 *   extension must match this filename's extension. Throws
 *   `ExtensionMismatchError` on mismatch — caller should catch and surface
 *   to the user. Saves all the IO + hash + probe work that would otherwise
 *   run before the match check inevitably rejects on file_hash mismatch.
 */
/**
 * Step 1: ask the user to pick a file and resolve a usable filename.
 * Returns `null` if the user canceled. Throws `ExtensionMismatchError`
 * when called with `expectedFilename` and the picked file's extension
 * doesn't match — caller catches and surfaces a clear error before any
 * IO runs.
 */
async function pickSourceFile(opts?: {
  expectedFilename?: string;
}): Promise<{ source: File; filename: string } | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['application/epub+zip', 'application/pdf', 'application/zip', '*/*'],
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (result.canceled) return null;
  const asset = result.assets[0];
  if (!asset) return null;

  // Default-filename fallback: prefer the asset's mimeType to pick the
  // correct extension. EPUB stays the default for the unknown case since
  // it's been the only supported format historically.
  const fallbackExt = asset.mimeType === 'application/pdf' ? 'pdf' : 'epub';
  const filename = asset.name || `book-${Date.now()}.${fallbackExt}`;

  if (opts?.expectedFilename) {
    const pickedExt = extOf(filename);
    const expectedExt = extOf(opts.expectedFilename);
    if (pickedExt !== expectedExt) {
      throw new ExtensionMismatchError(pickedExt, expectedExt);
    }
  }
  return { source: new File(asset.uri), filename };
}

/**
 * Step 2: copy the picked file into the documents-dir target slot,
 * applying the defensive-reimport rule (only matching file_hash keeps
 * existing per-filename local state; anything weaker → wipe and start
 * clean). Returns the new file_hash plus a flag indicating whether the
 * import is a no-op same-bytes re-import.
 */
async function commitFileToTarget(
  source: File,
  filename: string,
): Promise<{ target: File; newFileHash: string | null; wasAlreadyPresentSameBytes: boolean }> {
  const target = new File(booksDir(), filename);

  let newFileHash: string | null = null;
  try {
    const bytes = await source.bytes();
    newFileHash = await sha256Hex(bytes);
  } catch {
    /* hash computation failed — defensive path below skips the check */
  }

  let wasAlreadyPresentSameBytes = false;
  if (target.exists) {
    const oldFileHash = await getStoredFileHash(filename);
    const sameBytes = Boolean(newFileHash && oldFileHash && oldFileHash === newFileHash);
    wasAlreadyPresentSameBytes = sameBytes;
    if (!sameBytes) {
      await wipeBookLocalState(filename);
    }
    target.delete();
  }
  source.copy(target);
  if (newFileHash) {
    await setStoredFileHash(filename, newFileHash);
  }
  return { target, newFileHash, wasAlreadyPresentSameBytes };
}

type IdentityFields = {
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
  dcIdentifier: string | null;
  language: string | null;
  publisher: string | null;
};

/**
 * Step 3: derive title/author/identity-hashes from the on-disk file.
 * Branches on extension — PDF → `probePdfFile`, EPUB → `probeEpubFile`,
 * everything else → filename heuristics only. Mobile leaves the
 * text-derived + visual fingerprint fields null (no PDF text extractor
 * or render-to-grayscale pipeline here).
 */
async function extractIdentity(filename: string): Promise<IdentityFields> {
  const empty: IdentityFields = {
    title: '',
    author: '',
    fileHash: null,
    contentHash: null,
    pdfIdOriginal: null,
    pdfIdCurrent: null,
    pageCount: null,
    hasTextLayer: null,
    producer: null,
    xmpDocumentId: null,
    xmpOriginalId: null,
    dcIdentifier: null,
    language: null,
    publisher: null,
  };

  const lower = filename.toLowerCase();
  if (lower.endsWith('.pdf')) {
    const { probePdfFile } = await import('./pdfIdentity');
    const probe = await probePdfFile(filename);
    return {
      ...empty,
      title: probe.title ?? metadataFromFilename(filename).title,
      fileHash: probe.fileHash,
      pdfIdOriginal: probe.pdfIdOriginal,
      pdfIdCurrent: probe.pdfIdCurrent,
      pageCount: probe.pageCount,
      hasTextLayer: probe.hasTextLayer,
      producer: probe.producer,
      xmpDocumentId: probe.xmpDocumentId,
      xmpOriginalId: probe.xmpOriginalId,
    };
  }
  if (lower.endsWith('.epub')) {
    const { probeEpubFile } = await import('./epubIdentity');
    const probe = await probeEpubFile(filename);
    const fallback = metadataFromFilename(filename);
    return {
      ...empty,
      title: probe?.title ?? fallback.title,
      author: probe?.creator ?? fallback.author,
      fileHash: probe?.fileHash ?? null,
      contentHash: probe?.contentHash ?? null,
      dcIdentifier: probe?.dcIdentifier ?? null,
      language: probe?.language ?? null,
      publisher: probe?.publisher ?? null,
    };
  }
  const meta = metadataFromFilename(filename);
  return { ...empty, title: meta.title, author: meta.author };
}

export async function importEpub(opts?: {
  expectedFilename?: string;
}): Promise<ImportedBook | null> {
  // 1. Pick + extension-check.
  const picked = await pickSourceFile(opts);
  if (!picked) return null;

  // 2. Copy bytes to the target slot, honoring the defensive-reimport
  //    rule. After this point the on-disk file is the new one.
  const { target, wasAlreadyPresentSameBytes } = await commitFileToTarget(
    picked.source,
    picked.filename,
  );

  // 3. Re-read the on-disk file for identity + metadata. PDF/EPUB
  //    branches handle their own probes.
  const id = await extractIdentity(picked.filename);

  // 4. Sanitize + finalize. Sanitization strips characters Postgres
  //    can't store (NUL bytes from UTF-16BE PDF /Title fields, etc.)
  //    so the eventual create POST doesn't reject the row.
  return {
    filename: picked.filename,
    title: sanitizeMeta(id.title) ?? metadataFromFilename(picked.filename).title,
    author: sanitizeMeta(id.author) ?? '',
    fileHash: id.fileHash,
    contentHash: id.contentHash,
    pdfIdOriginal: id.pdfIdOriginal,
    pdfIdCurrent: id.pdfIdCurrent,
    pageCount: id.pageCount,
    hasTextLayer: id.hasTextLayer,
    producer: sanitizeMeta(id.producer),
    xmpDocumentId: id.xmpDocumentId,
    xmpOriginalId: id.xmpOriginalId,
    // Text-derived + visual fingerprint fields stay null on mobile.
    pageHashes: null,
    textLength: null,
    detectedDoi: null,
    detectedIsbn: null,
    pagePhashes: null,
    fingerprintVersion: FINGERPRINT_VERSION,
    dcIdentifier: sanitizeMeta(id.dcIdentifier),
    language: sanitizeMeta(id.language),
    publisher: sanitizeMeta(id.publisher),
    uri: target.uri,
    wasAlreadyPresentSameBytes,
  };
}

/**
 * Strip NUL and C0 control bytes from metadata strings before they hit the
 * backend. PostgreSQL's UTF-8 TEXT columns reject \x00; PDF UTF-16BE titles
 * with padding bytes and octal `\000` escapes trip this in the wild.
 */
function sanitizeMeta(s: string | null | undefined): string | null {
  if (s == null) return null;
  const cleaned = s.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '').trim();
  return cleaned || null;
}

function metadataFromFilename(filename: string): { title: string; author: string } {
  const stem = filename.replace(/\.[^.]+$/, '');
  // Common patterns: "Title - Author", "Author - Title", "Title_Author"
  const hyphenSplit = stem.split(/\s*-\s*/);
  if (hyphenSplit.length >= 2) {
    return { title: hyphenSplit[0]!.trim(), author: hyphenSplit.slice(1).join(' - ').trim() };
  }
  return { title: stem.replace(/[_]+/g, ' ').trim(), author: '' };
}

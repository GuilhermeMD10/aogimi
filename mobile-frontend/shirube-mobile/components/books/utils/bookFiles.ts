import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { wipeBookLocalState } from '@/lib/auth/wipeBookLocalState';
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
  /** PDF only: total page count. Mobile leaves null until phase 3. */
  pageCount: number | null;
  /** PDF only: extractable text layer present. Mobile leaves null until phase 3. */
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
export async function importEpub(opts?: {
  expectedFilename?: string;
}): Promise<ImportedBook | null> {
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

  // Locate-flow pre-check: bail before any IO if the picked extension
  // doesn't match what we're trying to locate.
  if (opts?.expectedFilename) {
    const pickedExt = extOf(filename);
    const expectedExt = extOf(opts.expectedFilename);
    if (pickedExt !== expectedExt) {
      throw new ExtensionMismatchError(pickedExt, expectedExt);
    }
  }

  const dir = booksDir();
  const target = new File(dir, filename);

  const source = new File(asset.uri);

  // Defensive re-import guard: if something already exists under this
  // filename, decide BEFORE overwriting whether the local state
  // (highlights, lastCfi, cached cover, fingerprint) belongs to the
  // bytes the user is bringing in. The only guarantee we accept is
  // matching file_hash — anything weaker (missing fingerprint, hash
  // failure, hash mismatch) is treated as "different file" and the
  // per-filename local state is dropped so the new file starts clean
  // rather than inheriting another book's reader state.
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

  let title: string;
  let author: string;
  let fileHash: string | null = null;
  let contentHash: string | null = null;
  let pdfIdOriginal: string | null = null;
  let pdfIdCurrent: string | null = null;
  let pageCount: number | null = null;
  let hasTextLayer: boolean | null = null;
  let producer: string | null = null;
  let xmpDocumentId: string | null = null;
  let xmpOriginalId: string | null = null;
  // Text-derived + visual fingerprint fields stay null on mobile — no PDF
  // text extractor and no render-to-grayscale pipeline here. Web populates
  // them; cross-device matching still works via file_hash + XMP + /ID.
  const pageHashes: string[] | null = null;
  const textLength: number | null = null;
  const detectedDoi: string | null = null;
  const detectedIsbn: string | null = null;
  const pagePhashes: string[] | null = null;
  let dcIdentifier: string | null = null;
  let language: string | null = null;
  let publisher: string | null = null;

  if (filename.toLowerCase().endsWith('.pdf')) {
    // PDFs: sha256 of bytes + /Title + /Producer + /ID[0]/[1] + XMP IDs
    // from the tail scan. page_count / has_text_layer deferred to phase 3.
    const { probePdfFile } = await import('./pdfIdentity');
    const probe = await probePdfFile(filename);
    title = probe.title ?? metadataFromFilename(filename).title;
    author = '';
    fileHash = probe.fileHash;
    pdfIdOriginal = probe.pdfIdOriginal;
    pdfIdCurrent = probe.pdfIdCurrent;
    pageCount = probe.pageCount;
    hasTextLayer = probe.hasTextLayer;
    producer = probe.producer;
    xmpDocumentId = probe.xmpDocumentId;
    xmpOriginalId = probe.xmpOriginalId;
  } else if (filename.toLowerCase().endsWith('.epub')) {
    // EPUBs: sha256 of bytes + spine-text hash + OPF metadata.
    const { probeEpubFile } = await import('./epubIdentity');
    const probe = await probeEpubFile(filename);
    const fallback = metadataFromFilename(filename);
    title = probe?.title ?? fallback.title;
    author = probe?.creator ?? fallback.author;
    fileHash = probe?.fileHash ?? null;
    contentHash = probe?.contentHash ?? null;
    dcIdentifier = probe?.dcIdentifier ?? null;
    language = probe?.language ?? null;
    publisher = probe?.publisher ?? null;
  } else {
    const meta = metadataFromFilename(filename);
    title = meta.title;
    author = meta.author;
  }

  return {
    filename,
    title: sanitizeMeta(title) ?? metadataFromFilename(filename).title,
    author: sanitizeMeta(author) ?? '',
    fileHash,
    contentHash,
    pdfIdOriginal,
    pdfIdCurrent,
    pageCount,
    hasTextLayer,
    producer: sanitizeMeta(producer),
    xmpDocumentId,
    xmpOriginalId,
    pageHashes,
    textLength,
    detectedDoi,
    detectedIsbn,
    pagePhashes,
    fingerprintVersion: FINGERPRINT_VERSION,
    dcIdentifier: sanitizeMeta(dcIdentifier),
    language: sanitizeMeta(language),
    publisher: sanitizeMeta(publisher),
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
  // eslint-disable-next-line no-control-regex
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

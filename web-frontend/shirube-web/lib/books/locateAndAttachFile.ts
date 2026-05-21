import { importBook, type BookRecord } from '@/lib/bookStore';
import { computeEpubIdentity } from '@/lib/epubIdentity';
import { computePdfIdentity } from '@/lib/pdfIdentity';
import { matchBooks } from '@/lib/booksApi';
import { markBookAvailable } from '@/lib/devicesApi';
import type { MatchType } from '@/lib/types';

const MAX_EPUB_SIZE = 50 * 1024 * 1024;
const MAX_PDF_SIZE = 500 * 1024 * 1024;

/**
 * Match types that prove the picked file is the same book as an existing
 * record. Anything outside this set (currently just `'filename'`) is too
 * weak to attach automatically — a PDF/EPUB sharing only its filename with
 * a library entry is almost always a different book.
 *
 * Used by both the locate flow and the +-button import flow so they treat
 * identity uniformly.
 */
export const STRONG_MATCH_TYPES: ReadonlySet<MatchType> = new Set<MatchType>([
  'file_hash',
  'xmp_original_id',
  'pdf_trailer_id',
  'doi',
  'isbn',
  'content',
  'metadata',
]);

/**
 * Match types strong enough to **silently auto-attach** a new import to
 * an existing backend record AND rename the local file to that record's
 * filename. ONLY `file_hash` qualifies — it's the single match type
 * that's a true "same bytes" guarantee.
 *
 * Why so strict: every other match type can collide between distinct
 * books in the real world:
 *   - `pdf_trailer_id` / `xmp_original_id` — batch-generated PDFs from
 *     a single script (e.g. a manga series exported in bulk) routinely
 *     share /ID and XMP OriginalDocumentID across volumes because the
 *     generator didn't seed per-output.
 *   - `doi` — possible but rare; same paper can have two DOIs (preprint,
 *     publisher) and different documents reference one another via DOI.
 *   - `isbn` + page_count(±5%) — manga volumes of similar length may
 *     coincidentally agree.
 *   - `content` — only fires when both PDFs have a text layer; manga is
 *     image-only and content_hash is null.
 *   - `metadata` — different books can share title+author.
 *
 * If we auto-attach on any of those, the silent rename overwrites the
 * existing local IDB slot — losing the original book's reader state.
 * That bug was caught in production: importing manga volume 2 silently
 * destroyed volume 1's progress because both PDFs shared /ID.
 *
 * The `STRONG_MATCH_TYPES` set above is still used by `locateAndAttachFile`
 * (locate flow), where the user has explicitly targeted a specific
 * backend record and is implicitly confirming "yes, this is that book".
 * For the +-button import path (`importBookWithMatch`), this tighter
 * set is the only safe rule.
 */
export const AUTO_ATTACH_TYPES: ReadonlySet<MatchType> = new Set<MatchType>([
  'file_hash',
]);

export type LocateResult =
  | { ok: true; record: BookRecord }
  | { ok: false; error: string };

/**
 * Verify a user-picked file actually belongs to the targeted backend book
 * record (`target.backendId`), then import + mark this device as available.
 *
 * Shared by:
 *   - ReaderView `onLocateFile` (locating a file for a "not on this device"
 *     entry from the library).
 *   - RestoreLibrary `onLocateFile` (the post-login reconcile screen).
 *
 * Both call sites previously hand-rolled the same validate → probe →
 * matchBooks → importBook + markBookAvailable sequence with subtly different
 * error wording.
 */
export async function locateAndAttachFile(input: {
  file: File;
  userId: number;
  deviceId: string;
  target: { backendId: string; title: string; filename: string };
}): Promise<LocateResult> {
  const { file, userId, deviceId, target } = input;

  // Quick pre-check: if the picked file's extension doesn't match the
  // target record's filename extension, reject before any IO. Saves
  // computing identity / hash / matchBooks for a pick that has zero
  // chance of attaching (different formats can't be the same content).
  const extensionError = validateExtensionMatch(file.name, target.filename, target.title);
  if (extensionError) return { ok: false, error: extensionError };

  const validationError = validateBookFile(file);
  if (validationError) return { ok: false, error: validationError };

  let identity: Awaited<ReturnType<typeof computeEpubIdentity>> | Awaited<ReturnType<typeof computePdfIdentity>> | null;
  let isPdf: boolean;
  try {
    const arrayBuffer = await file.arrayBuffer();
    isPdf = file.name.toLowerCase().endsWith('.pdf');
    identity = isPdf
      ? await computePdfIdentity(arrayBuffer).catch(() => null)
      : await computeEpubIdentity(arrayBuffer).catch(() => null);
  } catch {
    return { ok: false, error: 'Failed to read the picked file.' };
  }

  // The shared `MatchCandidate` shape holds both PDF- and EPUB-only
  // fields; whichever format doesn't apply leaves its field null.
  const pdfIdOriginal =
    isPdf && identity && 'pdfIdOriginal' in identity ? identity.pdfIdOriginal : null;
  const xmpOriginalId =
    isPdf && identity && 'xmpOriginalId' in identity ? identity.xmpOriginalId : null;
  const detectedDoi =
    isPdf && identity && 'detectedDoi' in identity ? identity.detectedDoi : null;
  const detectedIsbn =
    isPdf && identity && 'detectedIsbn' in identity ? identity.detectedIsbn : null;
  const pageCount =
    isPdf && identity && 'pageCount' in identity ? identity.pageCount : null;
  const pagePhashes =
    isPdf && identity && 'pagePhashes' in identity ? identity.pagePhashes : null;
  const contentHash = identity && 'contentHash' in identity ? identity.contentHash : null;
  const dcIdentifier =
    !isPdf && identity && 'dcIdentifier' in identity && typeof identity.dcIdentifier === 'string'
      ? identity.dcIdentifier
      : null;
  const candidates = [
    {
      file_hash: identity?.fileHash ?? '',
      content_hash: contentHash,
      pdf_id_original: pdfIdOriginal,
      xmp_original_id: xmpOriginalId,
      detected_doi: detectedDoi,
      detected_isbn: detectedIsbn,
      page_count: pageCount,
      page_phashes: pagePhashes,
      metadata: {
        title: '',
        author: '',
        dc_identifier: dcIdentifier,
        filename: file.name,
      },
    },
  ];

  let matchedBackendId: string | undefined;
  let matchedOtherTitle: string | undefined;
  try {
    const results = await matchBooks(userId, candidates);
    const match = results[0];
    // Filename matches are a weak fallback — when the user is locating a
    // file FOR a specific book, two unrelated files happening to share a
    // name must NOT be treated as the same book. Only accept strong
    // identity matches (file_hash, content, dc_identifier/metadata).
    if (match?.match && STRONG_MATCH_TYPES.has(match.match_type)) {
      matchedBackendId = match.match.id;
      if (matchedBackendId !== target.backendId) {
        matchedOtherTitle = match.match.title;
      }
    }
  } catch {
    return { ok: false, error: 'Failed to verify located file.' };
  }

  if (matchedBackendId !== target.backendId) {
    return {
      ok: false,
      error:
        `This file doesn’t match "${target.title}". ` +
        (matchedOtherTitle
          ? `It matched a different book ("${matchedOtherTitle}").`
          : 'No matching book found.'),
    };
  }

  let record: BookRecord;
  try {
    record = await importBook(file, userId);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: `Failed to import book: ${msg}` };
  }

  markBookAvailable(deviceId, target.backendId, userId).catch(() => undefined);
  return { ok: true, record };
}

/**
 * Pre-flight check shared by all import + locate code paths.
 */
export function validateBookFile(file: File): string | null {
  const name = file.name.toLowerCase();
  const isEpub = file.type === 'application/epub+zip' || name.endsWith('.epub');
  const isPdf = file.type === 'application/pdf' || name.endsWith('.pdf');
  if (!isEpub && !isPdf) return 'Invalid file type. Please upload an EPUB or PDF file.';
  if (isEpub && file.size > MAX_EPUB_SIZE) return 'EPUB too large. Maximum size is 50 MB.';
  if (isPdf && file.size > MAX_PDF_SIZE) return 'PDF too large. Maximum size is 500 MB.';
  return null;
}

/**
 * Locate-flow specific: rejects when the picked file's extension differs
 * from the targeted record's filename extension. Different file formats
 * can never be the same content, so there's no point hashing / matching
 * — fail fast with a clear message instead of running through the full
 * pipeline and ending at a generic "doesn't match".
 */
function validateExtensionMatch(
  pickedFilename: string,
  expectedFilename: string,
  targetTitle: string,
): string | null {
  const picked = extOf(pickedFilename);
  const expected = extOf(expectedFilename);
  if (picked === expected) return null;
  const expectedLabel = expected ? `.${expected}` : '(no extension)';
  const pickedLabel = picked ? `.${picked}` : '(no extension)';
  return (
    `"${targetTitle}" is a ${expectedLabel} file, but you picked a ${pickedLabel} file.` +
    ` Pick a matching file.`
  );
}

function extOf(filename: string): string {
  const dot = filename.lastIndexOf('.');
  return dot >= 0 ? filename.slice(dot + 1).toLowerCase() : '';
}

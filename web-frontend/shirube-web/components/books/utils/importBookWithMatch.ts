import {
  importBook,
  syncLocalBooksToBackend,
  type BookRecord,
} from './bookStore';
import { computeEpubIdentity } from '@/lib/epubIdentity';
import { computePdfIdentity } from '@/lib/pdfIdentity';
import { matchBooks } from './booksApi';
import { AUTO_ATTACH_TYPES } from './locateAndAttachFile';

export type ImportResult =
  | {
      ok: true;
      record: BookRecord;
      attachedToExisting: boolean;
      /** True when the picked file was already in the user's local library
       *  with byte-identical content. UI surfaces this as a "you already
       *  have this book" notice instead of treating it as a fresh import. */
      wasAlreadyPresentSameBytes: boolean;
    }
  | { ok: false; error: string };

/**
 * The +-button import path.
 *
 * Probes the picked file's identity, asks the backend matcher whether it's
 * a book we've seen before, then either:
 *
 *   - Attaches to an existing record when the match is *strong* (same
 *     file_hash, same content_hash, or same dc_identifier — anything that
 *     proves "this is the same book"). The local IDB filename is realigned
 *     to the matched record's filename so the library reconcile stays
 *     keyed correctly.
 *
 *   - Rejects when the picked filename collides with an existing record
 *     but identity *doesn't* match. This is the case the user hits when
 *     they tap "+", pick a different PDF whose filename happens to equal
 *     a "not on this device" register — the old code would silently
 *     mark that register as available with the wrong file underneath.
 *
 *   - Falls through to a normal new-book import in every other case.
 */
export async function importBookWithMatch(
  file: File,
  userId: number,
): Promise<ImportResult> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const isPdf = file.name.toLowerCase().endsWith('.pdf');
    const identity = isPdf
      ? await computePdfIdentity(arrayBuffer).catch(() => null)
      : await computeEpubIdentity(arrayBuffer).catch(() => null);

    const dcIdentifier =
      !isPdf && identity && 'dcIdentifier' in identity && typeof identity.dcIdentifier === 'string'
        ? identity.dcIdentifier
        : null;
    // The shared `MatchCandidate` shape holds both PDF- and EPUB-only
    // fields; whichever format doesn't apply leaves its field null.
    //   PDF:  pdfIdOriginal / xmpOriginalId / detectedDoi / detectedIsbn /
    //         pageCount / contentHash (text SHA, may be null if no text layer)
    //   EPUB: contentHash (spine SHA, always populated)
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
    const candidate = {
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
    };

    let strongMatchFilename: string | undefined;
    let filenameCollisionTitle: string | undefined;
    try {
      const [result] = await matchBooks(userId, [candidate]);
      if (result?.match) {
        if (AUTO_ATTACH_TYPES.has(result.match_type)) {
          strongMatchFilename = result.match.filename;
        } else if (result.match_type === 'filename') {
          filenameCollisionTitle = result.match.title;
        } else {
          // Matcher found a weaker similarity (xmp_original_id /
          // pdf_trailer_id / doi / isbn / content / metadata). We do
          // NOT auto-attach on these — they can collide between
          // distinct books (batch-generated PDFs share /ID, manga
          // volumes share ISBN+page_count, etc.). See AUTO_ATTACH_TYPES
          // doc for the full reasoning. Logged so the user can see in
          // dev tools that a similarity was detected but ignored on
          // purpose; the file is imported as new.
          console.info(
            '[importBookWithMatch] matcher returned',
            result.match_type,
            'for',
            file.name,
            '— not in AUTO_ATTACH_TYPES, importing as new (matched record:',
            result.match.title,
            ')',
          );
        }
      }
    } catch {
      // Matcher unreachable — fall through and import as new. The next
      // library reconcile will retry the registration.
    }

    if (!strongMatchFilename && filenameCollisionTitle) {
      return {
        ok: false,
        error:
          `A different book with the same filename ("${file.name}") is already in your library` +
          ` as "${filenameCollisionTitle}". Rename the file and try again, or use` +
          ` "Locate file" if you meant to import this specific book.`,
      };
    }

    // When a strong match exists with a different filename (e.g. same book
    // imported on a phone as "book.pdf" but downloaded on this device as
    // "Book Title - Author.pdf"), realign the local copy to the matched
    // filename so useSyncBooks's filename-keyed merge picks it up
    // correctly.
    const fileForImport =
      strongMatchFilename && strongMatchFilename !== file.name
        ? new File([arrayBuffer], strongMatchFilename, { type: file.type })
        : file;

    const { record, wasAlreadyPresentSameBytes } = await importBook(fileForImport, userId);

    try {
      // Ensure the backend register is in sync with what we just
      // imported locally. Failures are best-effort — the local IDB
      // row + sync map carry the pending state for the next push.
      await syncLocalBooksToBackend(userId);
    } catch {
      /* best-effort */
    }

    return {
      ok: true,
      record,
      attachedToExisting: Boolean(strongMatchFilename),
      wasAlreadyPresentSameBytes,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: `Failed to import book: ${msg}` };
  }
}

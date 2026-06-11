import { File } from 'expo-file-system';
import { ExtensionMismatchError, importEpub } from './bookFiles';
import { matchBooks } from './booksApi';
import { buildMatchCandidate } from './matchCandidate';
import { bookFilePath, deleteBookFile } from './bookPaths';
import { removeEntry, setStoredFileHash } from './bookLocalState';

// Shared "locate the file for an existing book register and attach it
// locally" flow. Used by:
//   - ImportBookScreen (the dedicated import-through-register page)
//   - ReaderScreen recovery (file missing when opening a synced book)
//   - OnboardingScreen reconcile (post-login "find your files")
//
// Identity is verified by file_hash only (the AUTO_ATTACH rule): the
// picked file must hash-match the targeted book record, otherwise it's
// rejected so we never overwrite a record's slot with the wrong
// content. Returns a discriminated outcome so each caller can decide
// how to surface it (alert, navigate, inline message).

export type LocateOutcome =
  | { status: 'attached' }
  | { status: 'canceled' }
  | { status: 'rejected'; message: string };

export async function locateBookFile(
  book: { id: string; filename: string; title: string },
  userId: number,
): Promise<LocateOutcome> {
  let imported;
  try {
    imported = await importEpub({ expectedFilename: book.filename });
  } catch (err) {
    if (err instanceof ExtensionMismatchError) {
      return {
        status: 'rejected',
        message: `"${book.title}" is a .${err.expected} file, but you picked a .${err.picked} file. Pick a matching one.`,
      };
    }
    return {
      status: 'rejected',
      message: err instanceof Error ? err.message : 'Could not read that file. Try a different one.',
    };
  }
  if (!imported) return { status: 'canceled' };

  // Identity-verify by file_hash before attaching. Without this, the
  // recovery flow would happily overwrite book.filename with whatever
  // the user picked, putting the wrong content "in the slot".
  let matchedId: string | null = null;
  let matchedOtherTitle: string | null = null;
  try {
    const [result] = await matchBooks(userId, [buildMatchCandidate(imported)]);
    // Only file_hash certifies "this IS that book". Weaker match types
    // (pdf_trailer_id, xmp_original_id, doi, isbn, content, metadata)
    // collide between distinct books — same rule the import flow uses.
    if (result?.match && result.match_type === 'file_hash') {
      matchedId = result.match.id;
      if (matchedId !== book.id) matchedOtherTitle = result.match.title;
    }
  } catch {
    /* matcher unreachable — treat as no match, reject below */
  }

  if (matchedId !== book.id) {
    // Throw away the picked litter — UNLESS the bytes were already on
    // disk under that filename (it's an already-imported book's file
    // sharing the slot). Deleting that would de-import the other book.
    if (!imported.wasAlreadyPresentSameBytes) {
      try { deleteBookFile(imported.filename); } catch { /* best-effort */ }
    }
    return {
      status: 'rejected',
      message: matchedOtherTitle
        ? `This file is already in your library as "${matchedOtherTitle}".`
        : `This file doesn't match "${book.title}". The book stays unimported.`,
    };
  }

  // Attach: move the picked file into the book's canonical slot and
  // record its fileHash (synced — the backend already has this record).
  try {
    if (imported.filename !== book.filename) {
      const local = new File(bookFilePath(imported.filename));
      local.copy(new File(bookFilePath(book.filename)));
      local.delete();
      await removeEntry(imported.filename);
    }
    if (imported.fileHash) {
      await setStoredFileHash(book.filename, imported.fileHash);
    }
    return { status: 'attached' };
  } catch (err) {
    return {
      status: 'rejected',
      message: err instanceof Error ? err.message : 'Could not save the file. Try again.',
    };
  }
}

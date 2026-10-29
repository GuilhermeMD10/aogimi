import { Alert } from 'react-native';
import { File } from 'expo-file-system';
import { ExtensionMismatchError, ImportRejectedError, importEpub } from './bookFiles';
import { matchBooks } from './booksApi';
import { buildMatchCandidate } from './matchCandidate';
import { bookFilePath, deleteBookFile } from './bookPaths';
import { removeEntry, setStoredFileHash } from './bookLocalState';
import { isOnlineNow } from '@/lib/network/network';
import type { Translate } from '@/lib/i18n/I18nContext';

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
// how to surface it (alert, navigate, inline message). The caller hands in
// its `t()`, so the outcome's text arrives already translated.

// `rejected` carries its own title: the reasons range from "wrong file" to
// "couldn't check" to "couldn't save", and a caller with one fixed alert
// title ("Doesn't match") mislabels two of the three.
export type LocateOutcome =
  | { status: 'attached' }
  | { status: 'canceled' }
  | { status: 'rejected'; title: string; message: string }
  /** No account to verify against. Not a `rejected`: the fix is a screen
   *  away, so the caller offers the way there. */
  | { status: 'signed-out' };

function unverified(t: Translate): LocateOutcome {
  return {
    status: 'rejected',
    title: t('library.locate.unverifiedTitle'),
    message: t('library.locate.unverifiedBody'),
  };
}

/**
 * The one alert for an outcome that needs telling. `attached` and
 * `canceled` are the caller's to act on; the two that only need words are
 * worded here, so the reader and the import screen say the same thing.
 */
export function alertLocateOutcome(
  outcome: LocateOutcome,
  t: Translate,
  goToProfile: () => void,
): void {
  if (outcome.status === 'rejected') {
    Alert.alert(outcome.title, outcome.message);
  } else if (outcome.status === 'signed-out') {
    Alert.alert(t('library.locate.signedOutTitle'), t('library.locate.signedOutBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('library.locate.goToProfile'), onPress: goToProfile },
    ]);
  }
}

export async function locateBookFile(
  book: { id: string; filename: string; title: string },
  userId: number | null,
  t: Translate,
): Promise<LocateOutcome> {
  // Verification is server-side: it needs an account to check against and a
  // network to reach it. Without either, the picked file would only be
  // hashed, rejected and deleted. Say so before the picker opens.
  if (userId == null) return { status: 'signed-out' };
  if (!isOnlineNow()) return unverified(t);

  let imported;
  try {
    imported = await importEpub({ expectedFilename: book.filename });
  } catch (err) {
    if (err instanceof ExtensionMismatchError) {
      return {
        status: 'rejected',
        title: t('library.locate.mismatchTitle'),
        message: t('library.locate.wrongTypeBody', {
          title: book.title,
          expected: err.expected,
          picked: err.picked,
        }),
      };
    }
    if (err instanceof ImportRejectedError) {
      const { title, message, params } = err.failure;
      return { status: 'rejected', title: t(title, params), message: t(message, params) };
    }
    console.warn('[locate] read failed', err);
    return {
      status: 'rejected',
      title: t('library.locate.readFailedTitle'),
      message: t('library.locate.readFailedBody'),
    };
  }
  if (!imported) return { status: 'canceled' };

  // Identity-verify by file_hash before attaching. Without this, the
  // recovery flow would happily overwrite book.filename with whatever
  // the user picked, putting the wrong content "in the slot".
  let matchedId: string | null = null;
  let matchedOtherTitle: string | null = null;
  let verified = true;
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
    // Matcher unreachable: the file was never checked, which is not the
    // same as "doesn't match" — tell the user that, below.
    verified = false;
  }

  if (!verified || matchedId !== book.id) {
    // Throw away the picked litter — UNLESS the bytes were already on
    // disk under that filename (it's an already-imported book's file
    // sharing the slot). Deleting that would de-import the other book.
    if (!imported.wasAlreadyPresentSameBytes) {
      try { deleteBookFile(imported.filename); } catch { /* best-effort */ }
    }
    if (!verified) return unverified(t);
    return {
      status: 'rejected',
      title: t('library.locate.mismatchTitle'),
      message: matchedOtherTitle
        ? t('library.locate.alreadyAsBody', { title: matchedOtherTitle })
        : t('library.locate.noMatchBody', { title: book.title }),
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
    console.warn('[locate] save failed', err);
    return {
      status: 'rejected',
      title: t('library.locate.saveFailedTitle'),
      message: t('library.locate.saveFailedBody'),
    };
  }
}

import { deleteCoverFor } from '@/lib/epubCover';
import { clearBookStorage } from '@/lib/readerStorage';
import { removeStoredFileHash } from '@/lib/storage/bookFingerprints';

/**
 * Wipe every per-book local register tied to a single filename. Called
 * from the import flow when re-importing a file whose new bytes differ
 * from the existing local file's bytes — we can't guarantee it's the
 * same book under that filename slot, so stale highlights / bookmarks /
 * lastCfi / cached cover / stored fingerprint for this filename get
 * dropped before the new file takes the slot.
 *
 * Scoped narrower than `wipeUserData` (which wipes everything for an
 * account switch). This is "wipe everything *tied to this one filename*".
 *
 * Keep this list in sync with the per-book entries in `wipeUserData.ts`
 * so anything user-scoped that lives keyed by filename gets cleared
 * from both paths.
 *
 * All imports static — `epubCover` reads path helpers from `bookPaths`
 * now (not `bookFiles`), so there's no cycle back through this module's
 * caller (`bookFiles.importEpub`).
 */
export async function wipeBookLocalState(filename: string): Promise<void> {
  await clearBookStorage(filename);          // reader_book_<filename>
  deleteCoverFor(filename);                  // covers/<safeName>.jpg
  await removeStoredFileHash(filename);      // book_fingerprints_v1[filename]
}

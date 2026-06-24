// Wipe every per-book local register for a single filename. Called from
// the import flow when re-importing a file whose new bytes differ from
// the existing local file's bytes — we can't guarantee it's the same
// book under that filename slot, so stale highlights / bookmarks /
// lastCfi / progress for this filename get dropped before the new file
// takes the slot.
//
// Scoped narrower than `wipeUserData` (which wipes everything for an
// account switch). This is "wipe everything *tied to this one filename*".
//
// Keep this list in sync with `wipeUserData.ts` so anything user-scoped
// that lives keyed by filename gets cleared from both paths.

const PER_BOOK_PREFIXES = ['reader_book_', 'reader_progress_'];

export function wipeBookLocalState(filename: string): void {
  if (typeof window === 'undefined') return;
  try {
    for (const prefix of PER_BOOK_PREFIXES) {
      localStorage.removeItem(prefix + filename);
    }
  } catch {
    /* private mode / quota — best-effort */
  }
}

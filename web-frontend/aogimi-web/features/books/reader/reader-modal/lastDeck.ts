/**
 * The deck the last card went into — page 11's "default is the last used
 * deck". A device preference in localStorage; the id is validated against the
 * live deck list on read, so a stale or another account's id just falls
 * through to the first deck.
 */
const KEY = 'aogimi-last-deck';

export function getLastDeckId(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function setLastDeckId(id: string): void {
  try {
    localStorage.setItem(KEY, id);
  } catch {
    /* not persisted; the next card asks again */
  }
}

/**
 * The dock's routes, in render order.
 *
 *  - **No Settings entry**, deliberately: settings is reached from
 *    `/profile`'s Settings button, not from the dock.
 *  - **Sky and Decks are one entry.** The deck grid and the star map are one
 *    page at `/sky` — the decks *are* the constellations, so a second entry
 *    would be the same destination twice. The key and label say "decks"
 *    because that is what the page is for.
 *  - **No Home entry.** The library is the landing page, so a Home `/` would
 *    be Reader's destination under a second name.
 *
 * Only the primary group lives here, so the divider in the component separates
 * these from Profile — which is deliberately not in this list, because it
 * renders an avatar rather than an icon and is spelled out there.
 */

export type DockKey = 'reader' | 'dictionary' | 'decks';

export type DockItem = {
  key: DockKey;
  label: string;
  path: string;
};

/** Left of the divider. Profile follows them, built in the component. */
export const DOCK_PRIMARY: DockItem[] = [
  // `/`, not `/reader` — the shelf is the landing page and `/reader/<bookId>`
  // is a single open book, which hides the dock entirely.
  { key: 'reader', label: 'Reader', path: '/' },
  { key: 'dictionary', label: 'Dictionary', path: '/dictionary' },
  { key: 'decks', label: 'Decks', path: '/sky' },
];

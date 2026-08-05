/**
 * The dock's routes, in render order.
 *
 * Two changes from the `WorkspaceNav` set this replaces:
 *  - **Settings is out.** Pre-decided when settings was redesigned: the panel
 *    is reached from `/profile`'s Settings button, and DECISIONS.md recorded
 *    that the nav's settings button would leave "when that refactor lands".
 *    This is that refactor.
 *  - **Sky came and went.** It earned an entry when `/sky` became the star
 *    map, and lost it when that map merged into `/decks` — the sky *is* the
 *    decks page now, so a second entry would be the same destination twice.
 *  - **Home went too**, with the dashboard it pointed at. The library is the
 *    landing page now, so Home's `/` would have been Reader's destination
 *    under a second name. Reader inherited the route.
 *
 * Only the primary group is left, so the divider in the component now separates
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
  { key: 'decks', label: 'Decks', path: '/decks' },
];

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
 *
 * Profile is deliberately not in this list — it renders an avatar rather than
 * an icon, so it's spelled out in the component.
 */

export type DockKey = 'reader' | 'dictionary' | 'decks' | 'home';

export type DockItem = {
  key: DockKey;
  label: string;
  path: string;
};

/** Left of the divider. */
export const DOCK_PRIMARY: DockItem[] = [
  { key: 'reader', label: 'Reader', path: '/reader' },
  { key: 'dictionary', label: 'Dictionary', path: '/dictionary' },
  { key: 'decks', label: 'Decks', path: '/decks' },
];

/** Right of the divider. Profile follows these, built in the component. */
export const DOCK_SECONDARY: DockItem[] = [{ key: 'home', label: 'Home', path: '/' }];

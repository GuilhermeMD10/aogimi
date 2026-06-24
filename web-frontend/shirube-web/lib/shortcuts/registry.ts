// Keyboard shortcut registry — single source of truth.
//
// Every shortcut in the app lives here. The provider in
// `components/providers/ShortcutsProvider.tsx` reads this list once and
// dispatches `keydown` to handlers registered via `useShortcut(id, fn)`.
// The cheatsheet (`?` modal) iterates the same list to render its rows.
// Adding a new shortcut = (1) append an entry, (2) call `useShortcut(id, fn)`
// in whichever component owns the action.

/** A single key combo: zero or more modifiers + one key.
 *  `key` matches `KeyboardEvent.key` (compared case-insensitively).
 *  e.g. `{ key: 'h', alt: true }` is Alt+H. */
export type ShortcutBinding = {
  key: string;
  alt?: boolean;
  ctrl?: boolean;
  shift?: boolean;
  meta?: boolean;
};

/** Where the shortcut fires from. The provider applies a global keydown
 *  listener; `scope` is informational for the cheatsheet UI today. */
export type ShortcutScope = 'global' | 'reader';

export type ShortcutDef = {
  id: string;
  /** Primary binding first; aliases (e.g. ArrowDown for Next page) follow.
   *  All bindings fire the same handler; the cheatsheet shows them with `/`. */
  keys: readonly [ShortcutBinding, ...ShortcutBinding[]];
  scope: ShortcutScope;
  /** One-line label for the cheatsheet row. */
  description: string;
  /** Group heading in the cheatsheet (e.g. "Reader · Annotations"). */
  group: string;
};

export const SHORTCUTS = [
  // ── Global ───────────────────────────────────────────────────────────
  {
    id: 'global:show-cheatsheet',
    keys: [{ key: '?', shift: true }],
    scope: 'global',
    description: 'Show / hide this cheatsheet',
    group: 'General',
  },

  // ── Reader ───────────────────────────────────────────────────────────
  {
    id: 'reader:highlight-yellow',
    keys: [{ key: 'h', alt: true }],
    scope: 'reader',
    description: 'Highlight the current selection (yellow)',
    group: 'Reader · Annotations',
  },
  {
    id: 'reader:bookmark',
    // Pre-existing binding — kept on the plain key for back-compat.
    keys: [{ key: 'b' }],
    scope: 'reader',
    description: 'Bookmark the current page',
    group: 'Reader · Annotations',
  },
  {
    id: 'reader:tts-toggle',
    // Pre-existing binding — kept on the plain key for back-compat.
    keys: [{ key: 't' }],
    scope: 'reader',
    description: 'Toggle text-to-speech',
    group: 'Reader · Playback',
  },
  {
    id: 'reader:page-next',
    keys: [{ key: 'ArrowRight' }, { key: 'ArrowDown' }],
    scope: 'reader',
    description: 'Next page',
    group: 'Reader · Navigation',
  },
  {
    id: 'reader:page-prev',
    keys: [{ key: 'ArrowLeft' }, { key: 'ArrowUp' }],
    scope: 'reader',
    description: 'Previous page',
    group: 'Reader · Navigation',
  },
] as const satisfies readonly ShortcutDef[];

export type ShortcutId = (typeof SHORTCUTS)[number]['id'];

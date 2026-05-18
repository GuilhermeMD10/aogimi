import type { ShortcutBinding, ShortcutDef } from './registry';

/** True when the keyboard event matches the binding's key + modifier mask
 *  exactly. Key compares case-insensitively (KeyboardEvent.key is already
 *  case-aware for letters when Shift is held, but the binding's `key` is a
 *  canonical lowercase letter — we lowercase the event side too). */
export function bindingMatches(e: KeyboardEvent, b: ShortcutBinding): boolean {
  if (e.key.toLowerCase() !== b.key.toLowerCase()) return false;
  return (
    e.altKey === (b.alt ?? false) &&
    e.ctrlKey === (b.ctrl ?? false) &&
    e.shiftKey === (b.shift ?? false) &&
    e.metaKey === (b.meta ?? false)
  );
}

/** True when any binding on the definition matches the event. */
export function defMatches(e: KeyboardEvent, def: ShortcutDef): boolean {
  for (const b of def.keys) if (bindingMatches(e, b)) return true;
  return false;
}

/** True when the event target is a text-entry control. The provider skips
 *  *all* shortcuts when this is true so typing in inputs never triggers
 *  page navigation, bookmarking, etc. */
export function isFromEditableTarget(e: KeyboardEvent): boolean {
  const t = e.target as HTMLElement | null;
  if (!t) return false;
  const tag = t.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (t.isContentEditable) return true;
  return false;
}

// ─────────────────────────────────────────────────────────────────────────────
// Display formatting — for the cheatsheet UI.
// ─────────────────────────────────────────────────────────────────────────────

const KEY_LABELS: Record<string, string> = {
  ArrowRight: '→',
  ArrowLeft: '←',
  ArrowUp: '↑',
  ArrowDown: '↓',
  Enter: 'Enter',
  Escape: 'Esc',
  ' ': 'Space',
  Backspace: '⌫',
  Tab: 'Tab',
};

function formatKey(k: string): string {
  if (k in KEY_LABELS) return KEY_LABELS[k]!;
  return k.length === 1 ? k.toUpperCase() : k;
}

export function formatBinding(b: ShortcutBinding): string {
  const parts: string[] = [];
  if (b.ctrl) parts.push('Ctrl');
  if (b.alt) parts.push('Alt');
  if (b.shift) parts.push('Shift');
  if (b.meta) parts.push('⌘');
  parts.push(formatKey(b.key));
  return parts.join(' + ');
}

/** Formats all bindings on a def, joined by ` / ` so the cheatsheet can show
 *  e.g. `→ / ↓` for the Next-page shortcut. */
export function formatDef(def: ShortcutDef): string {
  return def.keys.map(formatBinding).join(' / ');
}

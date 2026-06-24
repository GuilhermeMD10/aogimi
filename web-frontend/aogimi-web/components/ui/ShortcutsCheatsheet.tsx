'use client';

import { useEffect, useMemo } from 'react';
import { X } from 'lucide-react';
import { SHORTCUTS, type ShortcutDef } from '@/lib/shortcuts/registry';
import { formatDef } from '@/lib/shortcuts/match';
import { useShortcuts } from '@/components/providers/ShortcutsProvider';

// Cheatsheet modal. Reads every entry in the shortcut registry, groups by
// `def.group`, renders one row per definition with its description on the
// left and key combo on the right. Press `?` to toggle (handled by the
// provider); press `Esc` to close (handled here).

export function ShortcutsCheatsheet() {
  const { cheatsheetOpen, setCheatsheetOpen } = useShortcuts();

  useEffect(() => {
    if (!cheatsheetOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setCheatsheetOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [cheatsheetOpen, setCheatsheetOpen]);

  const grouped = useMemo(() => {
    const byGroup = new Map<string, ShortcutDef[]>();
    for (const s of SHORTCUTS) {
      const arr = byGroup.get(s.group) ?? [];
      arr.push(s as ShortcutDef);
      byGroup.set(s.group, arr);
    }
    return Array.from(byGroup.entries());
  }, []);

  if (!cheatsheetOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onClick={() => setCheatsheetOpen(false)}
    >
      <div
        className="lgc-card flex max-h-[80vh] w-full max-w-md flex-col p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-baseline justify-between gap-4">
          <h2 className="font-display text-lg font-medium text-lgc-fg">
            Keyboard shortcuts
          </h2>
          <button
            type="button"
            onClick={() => setCheatsheetOpen(false)}
            aria-label="Close cheatsheet"
            className="flex items-center gap-1 text-xs text-lgc-fg-muted transition-colors hover:text-lgc-fg"
          >
            <X size={12} /> Esc
          </button>
        </div>

        <div className="lgc-scroll flex-1 overflow-auto pr-1">
          {grouped.map(([group, items]) => (
            <section key={group} className="mb-5 last:mb-0">
              <div className="lgc-section-label mb-2">{group}</div>
              <ul className="space-y-1.5">
                {items.map((def) => (
                  <li
                    key={def.id}
                    className="flex items-baseline justify-between gap-4 text-sm"
                  >
                    <span className="text-lgc-fg-muted">{def.description}</span>
                    <kbd className="shrink-0 rounded border border-lgc-border bg-lgc-bg-sunken px-1.5 py-0.5 font-mono text-[11px] text-lgc-fg">
                      {formatDef(def)}
                    </kbd>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

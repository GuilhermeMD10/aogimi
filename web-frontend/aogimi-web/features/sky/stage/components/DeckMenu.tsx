'use client';

import { useEffect, useRef, useState } from 'react';

import { Button, PANE } from '@/shared/components';
import { cn } from '@/lib/util/cn';

import { deckQuotaMessage } from '../lib/limits';

export type DeckMenuAction = 'create' | 'rename' | 'delete';

type Props = {
  /** `sky`: the whole-sky tier, where only creating a deck applies. `deck`: a
   *  focused deck, which adds rename and delete for that deck. */
  scope: 'sky' | 'deck';
  atDeckQuota: boolean;
  deckCount: number;
  onAction: (action: DeckMenuAction) => void;
};

/**
 * The field header's `⋯` — the home of every deck flow the handoff draws no
 * control for (owner, 2026-09-22): **New deck**, and on a focused deck
 * **Rename deck** and **Delete deck**. A `.pane` popover under the circle;
 * outside click and Escape close it, and that Escape stops here so the page's
 * tier walk (card → deck → sky) doesn't also fire.
 *
 * The items open dialogs (`DeckNameModal`, `ConfirmDialog`) rather than acting
 * directly: naming needs a field, deleting needs a confirm.
 */
export function DeckMenuButton({ scope, atDeckQuota, deckCount, onAction }: Props) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const pick = (action: DeckMenuAction) => {
    setOpen(false);
    onAction(action);
  };

  return (
    <div
      ref={wrapRef}
      className="relative"
      onKeyDown={(e) => {
        if (e.key === 'Escape' && open) {
          e.stopPropagation();
          setOpen(false);
        }
      }}
    >
      <Button
        variant="icon"
        glyph="more"
        size="sm"
        onClick={() => setOpen((v) => !v)}
        aria-label={scope === 'sky' ? 'Sky menu' : 'Deck menu'}
        aria-pressed={open}
        className="shadow-(--field-pill-shadow) text-(--ink-2)"
      />

      {open && (
        <div
          role="menu"
          className={cn(
            PANE,
            'absolute top-full right-0 z-50 mt-2 w-[228px] rounded-(--radius-control) p-1.5 shadow-(--shadow-card)',
          )}
        >
          <MenuItem onClick={() => pick('create')} disabled={atDeckQuota} autoFocus>
            New deck…
          </MenuItem>
          {atDeckQuota && (
            <p className="m-0 px-3 pt-1 pb-2 font-[family-name:var(--face-ui)] text-[11.5px] leading-snug text-(--ink-3)">
              {deckQuotaMessage(deckCount)}
            </p>
          )}
          {scope === 'deck' && (
            <>
              <MenuItem onClick={() => pick('rename')}>Rename deck…</MenuItem>
              <span aria-hidden className="my-1 block h-px bg-(--hairline)" />
              <MenuItem onClick={() => pick('delete')} danger>
                Delete deck…
              </MenuItem>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function MenuItem({
  children,
  onClick,
  disabled = false,
  danger = false,
  autoFocus = false,
}: {
  children: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  autoFocus?: boolean;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      disabled={disabled}
      autoFocus={autoFocus}
      className={cn(
        'flex h-10 w-full items-center rounded-[8px] px-3 text-left font-[family-name:var(--face-ui)] text-[14px] font-medium',
        'transition-[background-color] duration-120 ease-[ease]',
        'hover:bg-[rgb(var(--line-rgb)/0.04)] disabled:cursor-not-allowed disabled:opacity-45',
        'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-(--ink)',
        danger ? 'text-(--danger)' : 'text-(--ink)',
      )}
    >
      {children}
    </button>
  );
}

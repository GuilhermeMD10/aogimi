'use client';

// The floating selection toolbar (page 09): a 48px blurred pill at the
// selection with three actions — look the selection up, turn it into a card,
// copy it. Anchoring is the engines' (pointer coordinates in, clamped to the
// viewport here); only the pill is drawn here.
//
// No key chips: the reader's hotkeys (`D`, `A`) are not wired yet, and a drawn
// key is a promise (BRIEF §5).

import { forwardRef, useLayoutEffect, useRef } from 'react';
import { BookOpen, Copy, CopyPlus } from 'lucide-react';
import { PRESS } from '@/shared/components';
import { cn } from '@/lib/util/cn';

const EDGE_PAD = 8;

const UI = 'font-[family-name:var(--face-ui)]';

const ITEM = cn(
  PRESS,
  UI,
  'flex h-9 cursor-pointer items-center gap-2 rounded-full px-3 text-[13px] leading-none whitespace-nowrap',
  'transition-[color,background-color,transform] duration-120 ease-[ease]',
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ink)',
);

export type TextContextMenuProps = {
  x: number;
  y: number;
  /** The selection, for Copy. */
  text: string;
  onLookup: () => void;
  onAddCard: () => void;
  onClose: () => void;
};

export const TextContextMenu = forwardRef<HTMLDivElement, TextContextMenuProps>(
  function TextContextMenu({ x, y, text, onLookup, onAddCard, onClose }, ref) {
    const innerRef = useRef<HTMLDivElement>(null);

    // The clamped position is written straight to the node instead of going
    // through state: the correction is computed *from* the rendered box, so a
    // `setPos` here would be a render→measure→render loop. A layout effect runs
    // after the DOM update and before paint, so the pre-clamp `x`/`y` below is
    // never seen — it only has to be there so the first measurement happens near
    // the pointer rather than at the origin.
    useLayoutEffect(() => {
      const el = innerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      let left = x - rect.width * 0.55;
      let top = y;

      if (left < EDGE_PAD) left = EDGE_PAD;
      if (left + rect.width > vw - EDGE_PAD) left = vw - EDGE_PAD - rect.width;

      if (top + rect.height > vh - EDGE_PAD) top = vh - EDGE_PAD - rect.height;
      if (top < EDGE_PAD) top = EDGE_PAD;

      el.style.left = `${left}px`;
      el.style.top = `${top}px`;
    }, [x, y]);

    const copy = () => {
      void navigator.clipboard?.writeText(text).catch(() => {
        /* clipboard refused — the selection is still on the page */
      });
    };

    return (
      <div
        ref={(el) => {
          innerRef.current = el;
          if (typeof ref === 'function') ref(el);
          else if (ref) ref.current = el;
        }}
        role="toolbar"
        aria-label="Selection actions"
        style={{
          position: 'fixed',
          left: x,
          top: y,
          zIndex: 60,
          background: 'var(--pane-strong)',
          WebkitBackdropFilter: 'var(--blur-toolbar)',
          backdropFilter: 'var(--blur-toolbar)',
        }}
        className={cn(
          'flex h-12 items-center gap-1 rounded-full border border-(--hairline) px-1.5 shadow-(--shadow-toolbar)',
          'animate-[fade-in_120ms_ease-out] motion-reduce:animate-none',
        )}
      >
        <button
          type="button"
          className={cn(
            ITEM,
            'bg-(--accent) pr-3.5 pl-3 font-bold text-(--on-accent) shadow-[0_6px_16px_rgb(var(--accent-rgb)/0.3)] hover:brightness-[1.06]',
          )}
          onClick={() => {
            onLookup();
            onClose();
          }}
        >
          <BookOpen size={15} strokeWidth={2} aria-hidden />
          Dictionary
        </button>

        <button
          type="button"
          className={cn(ITEM, 'font-medium text-(--ink) hover:bg-[rgb(var(--line-rgb)/0.04)]')}
          onClick={() => {
            onAddCard();
            onClose();
          }}
        >
          <CopyPlus size={15} strokeWidth={2} aria-hidden />
          Add card
        </button>

        <span aria-hidden className="mx-0.5 h-5 w-px bg-[rgb(var(--line-rgb)/0.1)]" />

        <button
          type="button"
          className={cn(ITEM, 'font-medium text-(--ink-2) hover:bg-[rgb(var(--line-rgb)/0.04)] hover:text-(--ink)')}
          onClick={() => {
            copy();
            onClose();
          }}
        >
          <Copy size={15} strokeWidth={2} aria-hidden />
          Copy
        </button>
      </div>
    );
  },
);

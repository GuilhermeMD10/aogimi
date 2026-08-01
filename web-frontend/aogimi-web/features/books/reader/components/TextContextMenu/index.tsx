'use client';

// The selection menu, at the pointer. Two actions: look the selection up, or
// turn it into a card.
//
// The handoff puts three highlight swatches between them. Highlights don't
// exist in the app — no store, no anchoring — so the row is left out rather
// than stubbed.

import { forwardRef, useLayoutEffect, useRef, useState } from 'react';
import { Search, BookPlus } from 'lucide-react';
import { HAIRLINE } from '@/shared/components';
import { cn } from '@/lib/util/cn';

const EDGE_PAD = 8;

const ROW = cn(
  'flex w-full cursor-pointer items-center gap-[11px] rounded-(--radius-cover) px-[11px] py-2.5',
  'font-[family-name:var(--face-ui)] text-[13.5px] font-bold text-(--ink)',
  'transition-colors duration-150 hover:bg-(--track)',
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ink)',
);

export type TextContextMenuProps = {
  x: number;
  y: number;
  onLookup: () => void;
  onAddCard: () => void;
  onClose: () => void;
};

export const TextContextMenu = forwardRef<HTMLDivElement, TextContextMenuProps>(
  function TextContextMenu({ x, y, onLookup, onAddCard, onClose }, ref) {
    const innerRef = useRef<HTMLDivElement>(null);
    const [pos, setPos] = useState({ left: x, top: y });

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

      setPos({ left, top });
    }, [x, y]);

    return (
      <div
        ref={(el) => {
          (innerRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
          if (typeof ref === 'function') ref(el);
          else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = el;
        }}
        style={{ position: 'fixed', left: pos.left, top: pos.top, zIndex: 60 }}
        className={cn(
          'w-56 rounded-(--radius-input) border bg-(--bg) p-1.5 shadow-(--card-shadow-float)',
          HAIRLINE,
        )}
      >
        <button
          type="button"
          className={ROW}
          onClick={() => {
            onLookup();
            onClose();
          }}
        >
          <Search size={17} strokeWidth={1.9} />
          Dictionary
        </button>

        <div className={cn('mx-1.5 my-1 border-t', HAIRLINE)} />

        <button
          type="button"
          className={ROW}
          onClick={() => {
            onAddCard();
            onClose();
          }}
        >
          <BookPlus size={17} strokeWidth={1.9} className="text-(--accent)" />
          Add card
        </button>
      </div>
    );
  },
);

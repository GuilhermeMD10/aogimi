'use client';

import { forwardRef, useLayoutEffect, useRef, useState } from 'react';
import { Search, Languages, Plus } from 'lucide-react';
import { HIGHLIGHT_COLORS, type HighlightColor } from '@/components/reader/useBookStorage';
import type { TextContextMenuProps } from '@/components/reader/TextContextMenu/TextContextMenu';

const CTX_BTN =
  'flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[12.5px] text-lgc-fg-muted transition-colors hover:bg-lgc-bg-sunken hover:text-lgc-fg';

const EDGE_PAD = 8;

export const TextContextMenu = forwardRef<HTMLDivElement, TextContextMenuProps>(
  function TextContextMenu({ x, y, selectedCfi, epubHighlights, onLookup, onDeepL, onHighlight, onAddCard, onClose }, ref) {
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
        style={{
          position: 'fixed',
          left: pos.left,
          top: pos.top,
          zIndex: 50,
          boxShadow: '3px 3px 0 var(--lgc-fg)',
          borderWidth: 1.5,
          borderColor: 'var(--lgc-fg)',
        }}
        className="flex items-center gap-0.5 rounded-lg border border-lgc-border-strong bg-lgc-bg-elev p-1.5 shadow-[0_20px_40px_-10px_rgba(0,0,0,0.25)]"
      >
        <button type="button" onClick={() => { onLookup(); onClose(); }} className={CTX_BTN}><Search size={13} /> Dictionary</button>
        <span className="mx-0.5 h-4 w-px bg-lgc-border" />
        <button type="button" onClick={() => { onDeepL(); onClose(); }} className={CTX_BTN}><Languages size={13} /> DeepL</button>
        <span className="mx-0.5 h-4 w-px bg-lgc-border" />
        <div className="flex gap-1 px-1">
          {(['yellow', 'green', 'blue'] as HighlightColor[]).map((c) => {
            const active = selectedCfi ? epubHighlights.find((h) => h.cfi === selectedCfi)?.color === c : false;
            return (
              <button
                key={c} type="button"
                onClick={() => { onHighlight(c); onClose(); }}
                className={`h-4.5 w-4.5 rounded-[3px] transition-transform hover:scale-110 ${active ? 'ring-2 ring-lgc-fg ring-offset-1' : ''}`}
                style={{ background: HIGHLIGHT_COLORS[c] }}
                title={active ? `Remove ${c}` : c}
              />
            );
          })}
        </div>
        <span className="mx-0.5 h-4 w-px bg-lgc-border" />
        <button type="button" onClick={() => { onAddCard(); onClose(); }} className={`${CTX_BTN} text-lgc-accent`}><Plus size={13} /> Flashcard</button>
      </div>
    );
  },
);

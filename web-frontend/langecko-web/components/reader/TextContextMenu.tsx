'use client';

import { forwardRef } from 'react';
import { Search, Languages, Plus } from 'lucide-react';
import { HIGHLIGHT_COLORS, type HighlightColor, type EpubHighlight } from '@/components/reader/useBookStorage';

const CTX_BTN =
  'flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[12.5px] text-lgc-fg-muted transition-colors hover:bg-lgc-bg-sunken hover:text-lgc-fg';

type Props = {
  x: number;
  y: number;
  selectedText: string;
  selectedCfi: string | null;
  epubHighlights: EpubHighlight[];
  onLookup: () => void;
  onDeepL: () => void;
  onHighlight: (color: HighlightColor) => void;
  onAddCard: () => void;
  onClose: () => void;
};

export const TextContextMenu = forwardRef<HTMLDivElement, Props>(
  function TextContextMenu({ x, y, selectedCfi, epubHighlights, onLookup, onDeepL, onHighlight, onAddCard, onClose }, ref) {
    return (
      <div
        ref={ref}
        style={{ position: 'fixed', left: x, top: y, zIndex: 50, transform: 'translateX(-55%)' }}
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

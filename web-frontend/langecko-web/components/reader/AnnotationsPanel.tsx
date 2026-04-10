'use client';

import { useState } from 'react';
import { HIGHLIGHT_COLORS, type EpubBookmark, type EpubHighlight, type PdfBookmark } from '@/components/reader/useBookStorage';

type Props = {
  epubHighlights?: EpubHighlight[];
  epubBookmarks?: EpubBookmark[];
  pdfBookmarks?: PdfBookmark[];
  onJumpEpubHighlight?: (h: EpubHighlight) => void;
  onDeleteEpubHighlight?: (id: string) => void;
  onJumpEpubBookmark?: (b: EpubBookmark) => void;
  onDeleteEpubBookmark?: (id: string) => void;
  onJumpPdfBookmark?: (b: PdfBookmark) => void;
  onDeletePdfBookmark?: (id: string) => void;
  onClose: () => void;
};

type Tab = 'bookmarks' | 'highlights';


export function AnnotationsPanel({
  epubHighlights = [],
  epubBookmarks = [],
  pdfBookmarks = [],
  onJumpEpubHighlight,
  onDeleteEpubHighlight,
  onJumpEpubBookmark,
  onDeleteEpubBookmark,
  onJumpPdfBookmark,
  onDeletePdfBookmark,
  onClose,
}: Props) {
  const [tab, setTab] = useState<Tab>('bookmarks');

  const hasHighlights = epubHighlights.length > 0;
  const allBookmarks = [
    ...epubBookmarks.map(b => ({ type: 'epub' as const, ...b })),
    ...pdfBookmarks.map(b => ({ type: 'pdf' as const, ...b })),
  ].sort((a, b) => a.createdAt - b.createdAt);

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-lumina-border-divider px-3 py-1.5">
        <span className="text-xs font-medium text-lumina-primary-text">Annotations</span>
        <button
          type="button"
          onClick={onClose}
          className="text-xs text-lumina-secondary-text hover:text-lumina-primary-text"
        >
          ✕
        </button>
      </div>

      {/* Tabs */}
      <div className="flex shrink-0 border-b border-lumina-border-divider">
        {(['bookmarks', 'highlights'] as Tab[]).map(t => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`flex-1 py-1 text-xs capitalize transition-colors ${
              tab === t
                ? 'border-b-2 border-lumina-primary-teal font-medium text-lumina-primary-text'
                : 'text-lumina-secondary-text hover:bg-black/5'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {tab === 'bookmarks' ? (
          allBookmarks.length === 0 ? (
            <p className="px-3 py-4 text-center text-xs text-lumina-secondary-text">No bookmarks yet</p>
          ) : (
            <ul className="py-1">
              {allBookmarks.map(b => (
                <li
                  key={b.id}
                  className="flex items-center gap-1 border-b border-lumina-border-divider/50 px-2 py-1.5 last:border-0"
                >
                  <button
                    type="button"
                    onClick={() => {
                      if (b.type === 'epub' && onJumpEpubBookmark) onJumpEpubBookmark(b as EpubBookmark);
                      if (b.type === 'pdf' && onJumpPdfBookmark) onJumpPdfBookmark(b as PdfBookmark);
                    }}
                    className="min-w-0 flex-1 truncate text-left text-xs text-lumina-primary-text hover:text-lumina-primary-teal"
                  >
                    {b.label}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (b.type === 'epub' && onDeleteEpubBookmark) onDeleteEpubBookmark(b.id);
                      if (b.type === 'pdf' && onDeletePdfBookmark) onDeletePdfBookmark(b.id);
                    }}
                    className="shrink-0 text-[10px] text-lumina-secondary-text hover:text-red-500"
                    aria-label="Delete bookmark"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )
        ) : !hasHighlights ? (
          <p className="px-3 py-4 text-center text-xs text-lumina-secondary-text">No highlights yet</p>
        ) : (
          <ul className="py-1">
            {epubHighlights.map(h => (
              <li
                key={h.id}
                className="flex items-start gap-2 border-b border-lumina-border-divider/50 px-2 py-1.5 last:border-0"
              >
                <span
                  className="mt-0.5 h-3 w-3 shrink-0 rounded-full"
                  style={{ backgroundColor: HIGHLIGHT_COLORS[h.color] }}
                />
                <button
                  type="button"
                  onClick={() => onJumpEpubHighlight?.(h)}
                  className="min-w-0 flex-1 text-left text-xs text-lumina-primary-text hover:text-lumina-primary-teal"
                >
                  <span className="line-clamp-2">{h.text}</span>
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteEpubHighlight?.(h.id)}
                  className="shrink-0 text-[10px] text-lumina-secondary-text hover:text-red-500"
                  aria-label="Delete highlight"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

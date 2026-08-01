'use client';

// The reading surface: foliate's viewport, and the selection menu portalled to
// the body. The popovers live in the shell now — they share its anchor, so a
// panel is a prop passed up rather than a sibling rendered here.
//
// The background is the reader's *page* colour (light/dark/sepia), not the app
// theme. That's the one place in the app where the two deliberately part ways.

import { createPortal } from 'react-dom';
import { THEMES } from '@/features/books/reader/lib/readerConstants';
import { TextContextMenu } from '@/features/books/reader/components/TextContextMenu';
import type { TextReaderEngine } from './useTextReaderEngine';

interface TextReaderBodyProps {
  engine: TextReaderEngine;
  onLookup: (word: string, contextSentence?: string) => void;
  onAddCard: (word: string, contextSentence?: string) => void;
}

export function TextReaderBody({ engine, onLookup, onAddCard }: TextReaderBodyProps) {
  const {
    wrapperRef,
    ctxMenuRef,
    ready,
    error,
    selectedText,
    contextSentence,
    ctxMenu,
    setCtxMenu,
    prefs,
  } = engine;

  const theme = THEMES[prefs.theme];

  return (
    <>
      <div className="relative min-w-0 flex-1" style={{ background: theme.bg }}>
        {(error || !ready) && (
          <div
            className="absolute inset-0 z-10 flex items-center justify-center"
            style={{ background: theme.bg }}
          >
            {error ? (
              <p className="max-w-sm text-center text-[13.5px] text-(--accent)">
                This book couldn&apos;t be loaded: {error}
              </p>
            ) : (
              <p className="text-[13.5px] text-(--muted)">Opening&hellip;</p>
            )}
          </div>
        )}

        <div ref={wrapperRef} className="absolute inset-0 overflow-hidden" />
      </div>

      {ctxMenu &&
        createPortal(
          <TextContextMenu
            ref={ctxMenuRef}
            x={ctxMenu.x}
            y={ctxMenu.y}
            onLookup={() => onLookup(selectedText, contextSentence)}
            onAddCard={() => onAddCard(selectedText, contextSentence)}
            onClose={() => setCtxMenu(null)}
          />,
          document.body,
        )}
    </>
  );
}

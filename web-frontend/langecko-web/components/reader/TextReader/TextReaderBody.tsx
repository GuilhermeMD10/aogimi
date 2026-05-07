'use client';

// Renders everything below the TextReader top bar — TOC + viewport + typography
// panel + annotations panel + context menu portal + DeepL popup. Theme-agnostic.

import { createPortal } from 'react-dom';
import { TocPanel } from '@/components/reader/TocPanel';
import { AnnotationsPanel } from '@/components/reader/AnnotationsPanel';
import { DeepLTranslationPopup } from '@/components/DeepLTranslationPopup';
import { THEMES } from '@/components/reader/readerConstants';
import { TypographyPanel } from '@/components/reader/TypographyPanel';
import { TextContextMenu } from '@/components/reader/TextContextMenu';
import type { TextReaderEngine } from './useTextReaderEngine';

interface TextReaderBodyProps {
  engine: TextReaderEngine;
  onLookup: (word: string, contextSentence?: string) => void;
  onAddCard: (word: string, contextSentence?: string) => void;
}

export function TextReaderBody({ engine, onLookup, onAddCard }: TextReaderBodyProps) {
  const {
    wrapperRef,
    renditionRef,
    ctxMenuRef,
    typoPanelRef,
    ready,
    error,
    toc,
    panel,
    setPanel,
    showTypo,
    setShowTypo,
    selectedText,
    contextSentence,
    selectedCfi,
    ctxMenu,
    setCtxMenu,
    translation,
    setTranslation,
    prefs,
    savePrefs,
    epubHighlights,
    epubBookmarks,
    applyHighlight,
    deleteHighlight,
    removeEpubBookmark,
  } = engine;

  const theme = THEMES[prefs.theme];

  return (
    <>
      <div className="relative flex min-h-0 flex-1">
        {panel === 'toc' && (
          <div className="w-56 shrink-0 overflow-y-auto border-r border-lgc-border bg-lgc-bg-elev">
            <TocPanel
              items={toc}
              onNavigate={(href) => { void renditionRef.current?.display(href); setPanel(null); }}
              onClose={() => setPanel(null)}
            />
          </div>
        )}

        <div className="relative min-w-0 flex-1" style={{ background: theme.bg }}>
          {(error || !ready) && (
            <div className="absolute inset-0 z-10 flex items-center justify-center" style={{ background: theme.bg }}>
              {error
                ? <p className="max-w-sm text-center text-sm text-lgc-error">EPUB load error: {error}</p>
                : <p className="text-sm text-lgc-fg-muted">Loading&hellip;</p>}
            </div>
          )}

          <div ref={wrapperRef} className="absolute inset-0 overflow-hidden" />

          {showTypo && (
            <div ref={typoPanelRef} className="absolute right-3 top-2 z-30">
              <TypographyPanel prefs={prefs} onSavePrefs={savePrefs} onClose={() => setShowTypo(false)} />
            </div>
          )}
        </div>

        {panel === 'annotations' && (
          <div className="w-56 shrink-0 overflow-y-auto border-l border-lgc-border bg-lgc-bg-elev">
            <AnnotationsPanel
              epubHighlights={epubHighlights}
              epubBookmarks={epubBookmarks}
              onJumpEpubHighlight={(h) => { void renditionRef.current?.display(h.cfi); setPanel(null); }}
              onDeleteEpubHighlight={deleteHighlight}
              onJumpEpubBookmark={(b) => { void renditionRef.current?.display(b.cfi); setPanel(null); }}
              onDeleteEpubBookmark={removeEpubBookmark}
              onClose={() => setPanel(null)}
            />
          </div>
        )}
      </div>

      {ctxMenu && createPortal(
        <TextContextMenu
          ref={ctxMenuRef}
          x={ctxMenu.x}
          y={ctxMenu.y}
          selectedText={selectedText}
          selectedCfi={selectedCfi}
          epubHighlights={epubHighlights}
          onLookup={() => onLookup(selectedText, contextSentence)}
          onDeepL={() => setTranslation({ text: selectedText, x: ctxMenu.x, y: ctxMenu.y })}
          onHighlight={applyHighlight}
          onAddCard={() => onAddCard(selectedText, contextSentence)}
          onClose={() => setCtxMenu(null)}
        />,
        document.body,
      )}

      {translation && (
        <DeepLTranslationPopup
          originalText={translation.text}
          position={{ x: translation.x, y: translation.y }}
          onClose={() => setTranslation(null)}
        />
      )}
    </>
  );
}

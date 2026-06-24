'use client';

// Renders everything below the TextReader top bar — TOC + viewport + typography
// panel + annotations panel + context menu portal + DeepL popup. Theme-agnostic.

import { createPortal } from 'react-dom';
import { TocPanel } from '@/components/reader/TocPanel';
import { AnnotationsPanel } from '@/components/reader/AnnotationsPanel';
import { DeepLTranslationPopup } from '@/components/DeepLTranslationPopup';
import { DEEPL_ENABLED } from '@/lib/features/deepl';
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
    viewRef,
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
        <div className="relative min-w-0 flex-1" style={{ background: theme.bg }}>
          {(error || !ready) && (
            <div className="absolute inset-0 z-10 flex items-center justify-center" style={{ background: theme.bg }}>
              {error
                ? <p className="max-w-sm text-center text-sm text-lgc-error">EPUB load error: {error}</p>
                : <p className="text-sm text-lgc-fg-muted">Loading&hellip;</p>}
            </div>
          )}

          <div ref={wrapperRef} className="absolute inset-0 overflow-hidden" />

          {/* Floating TOC — top-left overlay, doesn't shift the viewport. */}
          {panel === 'toc' && (
            <div
              className="absolute left-3 top-2 z-30 flex w-56 flex-col overflow-hidden rounded-xl border border-lgc-border-strong bg-lgc-bg-elev shadow-xl"
              style={{ maxHeight: 'calc(100% - 16px)' }}
            >
              <TocPanel
                items={toc}
                onNavigate={(href) => { void viewRef.current?.goTo(href); setPanel(null); }}
                onClose={() => setPanel(null)}
              />
            </div>
          )}

          {/* Floating annotations (bookmarks + highlights) — top-right. */}
          {panel === 'annotations' && (
            <div
              className="absolute right-3 top-2 z-30 flex w-72 flex-col overflow-hidden rounded-xl border border-lgc-border-strong bg-lgc-bg-elev shadow-xl"
              style={{ maxHeight: 'calc(100% - 16px)' }}
            >
              <AnnotationsPanel
                epubHighlights={epubHighlights}
                epubBookmarks={epubBookmarks}
                onJumpEpubHighlight={(h) => { void viewRef.current?.goTo(h.cfi); setPanel(null); }}
                onDeleteEpubHighlight={deleteHighlight}
                onJumpEpubBookmark={(b) => { void viewRef.current?.goTo(b.cfi); setPanel(null); }}
                onDeleteEpubBookmark={removeEpubBookmark}
                onClose={() => setPanel(null)}
              />
            </div>
          )}

          {showTypo && (
            <div ref={typoPanelRef} className="absolute right-3 top-2 z-40">
              <TypographyPanel prefs={prefs} onSavePrefs={savePrefs} onClose={() => setShowTypo(false)} />
            </div>
          )}
        </div>
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
          onDeepL={() => {
            // DeepL is feature-flagged off (see lib/features/deepl.ts).
            // The context menu also gates its DeepL button so this
            // callback is unreachable from the UI today — guarded
            // here as a defense-in-depth match for the popup gate
            // below.
            if (DEEPL_ENABLED) {
              setTranslation({ text: selectedText, x: ctxMenu.x, y: ctxMenu.y });
            }
          }}
          onHighlight={applyHighlight}
          onAddCard={() => onAddCard(selectedText, contextSentence)}
          onClose={() => setCtxMenu(null)}
        />,
        document.body,
      )}

      {/* DeepL popup feature-flagged off (see lib/features/deepl.ts).
          State, render, and the upstream callback are all gated so
          re-enabling is a single edit. */}
      {DEEPL_ENABLED && translation && (
        <DeepLTranslationPopup
          originalText={translation.text}
          position={{ x: translation.x, y: translation.y }}
          onClose={() => setTranslation(null)}
        />
      )}
    </>
  );
}

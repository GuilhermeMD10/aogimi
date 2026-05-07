'use client';

// Renders everything below the MangaReader top bar — TOC + bookmarks panels +
// EPUB viewport. Theme-agnostic; both variants compose this with their own top bar.

import { TocPanel } from '@/components/reader/TocPanel';
import { AnnotationsPanel } from '@/components/reader/AnnotationsPanel';
import type { MangaReaderEngine } from './useMangaReaderEngine';

export function MangaReaderBody({ engine }: { engine: MangaReaderEngine }) {
  const {
    wrapperRef,
    renditionRef,
    ready,
    error,
    viewMode,
    toc,
    panel,
    setPanel,
    epubBookmarks,
    removeEpubBookmark,
  } = engine;

  return (
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

      {panel === 'bookmarks' && (
        <div className="w-56 shrink-0 overflow-y-auto border-r border-lgc-border bg-lgc-bg-elev">
          <AnnotationsPanel
            epubHighlights={[]}
            epubBookmarks={epubBookmarks}
            onJumpEpubHighlight={() => {}}
            onDeleteEpubHighlight={() => {}}
            onJumpEpubBookmark={(b) => { void renditionRef.current?.display(b.cfi); setPanel(null); }}
            onDeleteEpubBookmark={removeEpubBookmark}
            onClose={() => setPanel(null)}
          />
        </div>
      )}

      <div className="relative min-w-0 flex-1 bg-lgc-bg">
        {(error || !ready) && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-lgc-bg">
            {error
              ? <p className="max-w-sm text-center text-sm text-lgc-error">EPUB load error: {error}</p>
              : <p className="text-sm text-lgc-fg-muted">Loading&hellip;</p>}
          </div>
        )}

        <div className="absolute inset-0 flex justify-center overflow-hidden">
          <div
            ref={wrapperRef}
            className="h-full overflow-hidden"
            style={
              viewMode === 'single'
                ? { aspectRatio: '2/3', maxWidth: '100%' }
                : { width: '100%' }
            }
          />
        </div>
      </div>
    </div>
  );
}

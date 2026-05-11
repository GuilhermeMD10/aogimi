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

        {/* Floating TOC — top-left overlay, doesn't shift the viewport. */}
        {panel === 'toc' && (
          <div
            className="absolute left-3 top-2 z-30 flex w-56 flex-col overflow-hidden rounded-xl border border-lgc-border-strong bg-lgc-bg-elev shadow-xl"
            style={{ maxHeight: 'calc(100% - 16px)' }}
          >
            <TocPanel
              items={toc}
              onNavigate={(href) => { void renditionRef.current?.display(href); setPanel(null); }}
              onClose={() => setPanel(null)}
            />
          </div>
        )}

        {/* Floating bookmarks — top-right overlay. */}
        {panel === 'bookmarks' && (
          <div
            className="absolute right-3 top-2 z-30 flex w-72 flex-col overflow-hidden rounded-xl border border-lgc-border-strong bg-lgc-bg-elev shadow-xl"
            style={{ maxHeight: 'calc(100% - 16px)' }}
          >
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
      </div>
    </div>
  );
}

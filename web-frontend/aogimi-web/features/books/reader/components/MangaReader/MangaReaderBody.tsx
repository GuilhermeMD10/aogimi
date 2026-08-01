'use client';

// The fixed-layout viewport. The popovers live in the shell — they share its
// anchor, so a panel is passed up as a prop rather than rendered here.
//
// Single-page mode constrains the frame to a page's aspect ratio so one page
// isn't stretched across a wide window; the other modes fill the width and let
// foliate-fxl lay the pages out.

import type { MangaReaderEngine } from './useMangaReaderEngine';

export function MangaReaderBody({ engine }: { engine: MangaReaderEngine }) {
  const { wrapperRef, ready, error, viewMode } = engine;

  return (
    <div className="relative min-w-0 flex-1 bg-(--bg)">
      {(error || !ready) && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-(--bg)">
          {error ? (
            <p className="max-w-sm text-center text-[13.5px] text-(--accent)">
              This book couldn&apos;t be loaded: {error}
            </p>
          ) : (
            <p className="text-[13.5px] text-(--muted)">Opening&hellip;</p>
          )}
        </div>
      )}

      <div className="absolute inset-0 flex justify-center overflow-hidden">
        <div
          ref={wrapperRef}
          className="h-full overflow-hidden"
          style={
            viewMode === 'single' ? { aspectRatio: '2/3', maxWidth: '100%' } : { width: '100%' }
          }
        />
      </div>
    </div>
  );
}

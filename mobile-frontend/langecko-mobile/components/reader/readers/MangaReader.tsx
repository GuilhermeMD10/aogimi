import { ReaderBottomDock } from '../ReaderBottomDock';
import type { EpubTocItem } from '../foliateHtml';
import type { EpubBookmark, EpubHighlight, ReaderPrefs } from '@/lib/readerStorage';

export type MangaReaderProps = {
  title: string;
  progress: number;
  page: number;
  totalPages: number;
  toc: EpubTocItem[];
  bookmarks: EpubBookmark[];
  highlights: EpubHighlight[];
  prefs: ReaderPrefs;
  isBookmarked: boolean;
  // Active manga renderer. Toggling flips between MangaScrollView (vertical
  // continuous stream) and MangaPagedView (horizontal swipe + per-page
  // pinch zoom). Both share the same MangaSpineHandle / disk cache.
  mode: 'scroll' | 'pages';
  onToggleMode: () => void;
  // Chevron callback used by both views — jumps to a spine index (the
  // current view's ref handles the actual scroll/setIndex).
  onJumpSpine: (spineIndex: number) => void;
  onToggleBookmark: () => void;
  onDeleteBookmark: (id: string) => void;
};

/**
 * Manga toolbar — thin wrapper around ReaderBottomDock with the 'manga'
 * variant. Manga is rendered by MangaScrollView (RN-side, see ReaderScreen),
 * not foliate; the dock just shows position and exposes bookmark / TOC.
 */
export function MangaReader({
  title,
  progress,
  page,
  totalPages,
  toc,
  bookmarks,
  highlights,
  prefs,
  isBookmarked,
  mode,
  onToggleMode,
  onJumpSpine,
  onToggleBookmark,
  onDeleteBookmark,
}: MangaReaderProps) {
  const goPrev = () => onJumpSpine(Math.max(0, page - 2));
  const goNext = () => onJumpSpine(Math.min(totalPages - 1, page));

  return (
    <ReaderBottomDock
      variant="manga"
      title={title}
      progress={progress}
      page={page}
      totalPages={totalPages}
      bookmarked={isBookmarked}
      mangaMode={mode}
      onToggleMangaMode={onToggleMode}
      layout="pages"
      direction="horizontal"
      toc={toc}
      bookmarks={bookmarks}
      highlights={highlights}
      prefs={prefs}
      onPrev={goPrev}
      onNext={goNext}
      onToggleBookmark={onToggleBookmark}
      onNavigate={(href) => {
        // Jump via TOC href is not supported in RN-only manga yet. The
        // dock's TOC sheet still opens; tapping a chapter will fall through
        // until we wire href → spine resolution.
        void href;
      }}
      onJumpBookmark={(b) => {
        // Bookmarks store CFI; for manga we treat the bookmark label as
        // pointing at a spine index when set from the toolbar. Fallback:
        // ignore unsupported jumps.
        void b;
      }}
      onJumpHighlight={() => undefined}
      onDeleteBookmark={onDeleteBookmark}
      onDeleteHighlight={() => undefined}
      onChangePrefs={() => undefined}
      onChangeLayout={() => undefined}
    />
  );
}

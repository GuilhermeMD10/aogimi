import { ReaderBottomDock, type DockMode } from '../ReaderBottomDock';
import type { EpubTocItem } from '../../lib/foliateHtml';
import type { ReaderPrefs } from '../../lib/readerStorage';
import type { MangaPageDir } from '../../lib/readerLayout';

export type MangaReaderProps = {
  // Only used for chevron-driven prev/next spine jumps; the visible page
  // number lives in the top bar's progress%, not here.
  page: number;
  totalPages: number;
  toc: EpubTocItem[];
  prefs: ReaderPrefs;
  // Active manga renderer. Toggling flips between MangaScrollView (vertical
  // continuous stream) and MangaPagedView (horizontal swipe + per-page
  // pinch zoom). Both share the same MangaSpineHandle / disk cache.
  mode: 'scroll' | 'pages';
  onToggleMode: () => void;
  // Page-flip direction; only meaningful in 'pages' mode but the toolbar
  // surfaces the control regardless so the choice persists.
  pageDir: MangaPageDir;
  onTogglePageDir: () => void;
  // Chevron callback used by both views — jumps to a spine index (the
  // current view's ref handles the actual scroll/setIndex).
  onJumpSpine: (spineIndex: number) => void;
  onModeChange?: (mode: DockMode) => void;
};

/**
 * Manga toolbar — thin wrapper around ReaderBottomDock with the 'manga'
 * variant. Manga is rendered by MangaScrollView (RN-side, see ReaderScreen),
 * not foliate; the dock just shows position and exposes the TOC.
 */
export function MangaReader({
  page,
  totalPages,
  toc,
  prefs,
  mode,
  onToggleMode,
  pageDir,
  onTogglePageDir,
  onJumpSpine,
  onModeChange,
}: MangaReaderProps) {
  const goPrev = () => onJumpSpine(Math.max(0, page - 2));
  const goNext = () => onJumpSpine(Math.min(totalPages - 1, page));

  return (
    <ReaderBottomDock
      variant="manga"
      mangaMode={mode}
      onToggleMangaMode={onToggleMode}
      mangaPageDir={pageDir}
      onToggleMangaPageDir={onTogglePageDir}
      layout="pages"
      direction="horizontal"
      toc={toc}
      prefs={prefs}
      onPrev={goPrev}
      onNext={goNext}
      onNavigate={(href) => {
        // Jump via TOC href is not supported in RN-only manga yet. The
        // dock's TOC sheet still opens; tapping a chapter will fall through
        // until we wire href → spine resolution.
        void href;
      }}
      onChangePrefs={() => undefined}
      onChangeLayout={() => undefined}
      onModeChange={onModeChange}
    />
  );
}

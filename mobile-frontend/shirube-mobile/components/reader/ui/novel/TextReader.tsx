import { ReaderBottomDock } from '../ReaderBottomDock';
import type { EpubTocItem } from '../../utils/foliateHtml';
import type { EpubBookmark, EpubHighlight, ReaderPrefs } from '../../utils/readerStorage';
import type { ReaderDirection, ReaderLayout } from '../../utils/readerLayout';

export type TextReaderProps = {
  rtl?: boolean;
  title: string;
  progress: number;
  toc: EpubTocItem[];
  prefs: ReaderPrefs;
  onChangePrefs: (patch: Partial<ReaderPrefs>) => void;
  highlights: EpubHighlight[];
  bookmarks: EpubBookmark[];
  isBookmarked: boolean;
  layout: ReaderLayout;
  direction: ReaderDirection;
  onPrev: () => void;
  onNext: () => void;
  onJumpHref: (href: string) => void;
  onJumpCfi: (cfi: string) => void;
  onToggleBookmark: () => void;
  onDeleteBookmark: (id: string) => void;
  onDeleteHighlight: (id: string) => void;
  onToggleLayout: () => void;
  onToggleDirection: () => void;
  onSetLayout?: (layout: ReaderLayout) => void;
  onSetDirection?: (direction: ReaderDirection) => void;
};

/**
 * Text-mode reader overlay. All reader chrome (toolbar + drawers) is now
 * one component — the floating-pill dock. This wrapper just passes through.
 *
 * Used directly for western books; wrapped by NovelReader for JP RTL (the
 * RTL flag flips prev↔next inside the dock's prev/next callbacks).
 */
export function TextReader({
  rtl,
  title,
  progress,
  toc,
  prefs,
  onChangePrefs,
  highlights,
  bookmarks,
  isBookmarked,
  layout,
  direction,
  onPrev,
  onNext,
  onJumpHref,
  onJumpCfi,
  onToggleBookmark,
  onDeleteBookmark,
  onDeleteHighlight,
  onToggleLayout,
  onToggleDirection,
  onSetLayout,
  onSetDirection,
}: TextReaderProps) {
  const handleChangeLayout = (patch: { layout?: ReaderLayout; direction?: ReaderDirection }) => {
    if (patch.layout && patch.layout !== layout) {
      if (onSetLayout) onSetLayout(patch.layout);
      else onToggleLayout();
    }
    if (patch.direction && patch.direction !== direction) {
      if (onSetDirection) onSetDirection(patch.direction);
      else onToggleDirection();
    }
  };

  return (
    <ReaderBottomDock
      title={title}
      progress={progress}
      bookmarked={isBookmarked}
      layout={layout}
      direction={direction}
      toc={toc}
      bookmarks={bookmarks}
      highlights={highlights}
      prefs={prefs}
      onPrev={rtl ? onNext : onPrev}
      onNext={rtl ? onPrev : onNext}
      onToggleBookmark={onToggleBookmark}
      onNavigate={onJumpHref}
      onJumpBookmark={(b) => onJumpCfi(b.cfi)}
      onJumpHighlight={(h) => onJumpCfi(h.cfi)}
      onDeleteBookmark={onDeleteBookmark}
      onDeleteHighlight={onDeleteHighlight}
      onChangePrefs={onChangePrefs}
      onChangeLayout={handleChangeLayout}
    />
  );
}

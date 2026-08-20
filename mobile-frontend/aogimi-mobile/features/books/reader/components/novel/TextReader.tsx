import { ReaderBottomDock, type DockMode } from '../ReaderBottomDock';
import type { EpubTocItem } from '../../lib/foliateHtml';
import type { ReaderPrefs } from '../../lib/readerStorage';
import type { ReaderDirection, ReaderLayout } from '../../lib/readerLayout';

export type TextReaderProps = {
  rtl?: boolean;
  toc: EpubTocItem[];
  prefs: ReaderPrefs;
  onChangePrefs: (patch: Partial<ReaderPrefs>) => void;
  layout: ReaderLayout;
  direction: ReaderDirection;
  onPrev: () => void;
  onNext: () => void;
  onJumpHref: (href: string) => void;
  onJumpCfi: (cfi: string) => void;
  onToggleLayout: () => void;
  onToggleDirection: () => void;
  onSetLayout?: (layout: ReaderLayout) => void;
  onSetDirection?: (direction: ReaderDirection) => void;
  onModeChange?: (mode: DockMode) => void;
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
  toc,
  prefs,
  onChangePrefs,
  layout,
  direction,
  onPrev,
  onNext,
  onJumpHref,
  onJumpCfi,
  onToggleLayout,
  onToggleDirection,
  onSetLayout,
  onSetDirection,
  onModeChange,
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
      layout={layout}
      direction={direction}
      toc={toc}
      prefs={prefs}
      onPrev={rtl ? onNext : onPrev}
      onNext={rtl ? onPrev : onNext}
      onNavigate={onJumpHref}
      onChangePrefs={onChangePrefs}
      onChangeLayout={handleChangeLayout}
      onModeChange={onModeChange}
    />
  );
}

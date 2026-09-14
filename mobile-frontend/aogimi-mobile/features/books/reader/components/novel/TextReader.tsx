import { ReaderBottomDock } from '../ReaderBottomDock';
import type { EpubTocItem } from '../../lib/foliateHtml';
import type { ReaderPrefs } from '../../lib/readerStorage';

export type TextReaderProps = {
  rtl?: boolean;
  toc: EpubTocItem[];
  prefs: ReaderPrefs;
  onChangePrefs: (patch: Partial<ReaderPrefs>) => void;
  onPrev: () => void;
  onNext: () => void;
  onJumpHref: (href: string) => void;
  onJumpCfi: (cfi: string) => void;
};

/**
 * Text-mode reader overlay. All reader chrome (toolbar + drawers) is one
 * component — the floating-pill dock. This wrapper just passes through.
 *
 * Used directly for western books; wrapped by NovelReader for JP vertical-rl.
 * The `rtl` flag flips which chevron means "onward": a vertical-rl book
 * advances leftwards, so the left chevron is the one that moves forward.
 */
export function TextReader({
  rtl,
  toc,
  prefs,
  onChangePrefs,
  onPrev,
  onNext,
  onJumpHref,
}: TextReaderProps) {
  return (
    <ReaderBottomDock
      toc={toc}
      prefs={prefs}
      onPrev={rtl ? onNext : onPrev}
      onNext={rtl ? onPrev : onNext}
      onNavigate={onJumpHref}
      onChangePrefs={onChangePrefs}
    />
  );
}

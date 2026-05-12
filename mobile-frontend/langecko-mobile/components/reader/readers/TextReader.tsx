import { useState } from 'react';
import { ReaderToolbar, type ToolbarAction } from '../ReaderToolbar';
import { TocSheet } from '../TocSheet';
import { AnnotationsSheet } from '../AnnotationsSheet';
import { TypographyPanel } from '../TypographyPanel';
import type { EpubTocItem } from '../foliateHtml';
import type { EpubBookmark, EpubHighlight, ReaderPrefs } from '@/lib/readerStorage';
import type { ReaderDirection, ReaderLayout } from '@/lib/readerLayout';

type Sheet = 'toc' | 'annotations' | 'typography' | null;

export type TextReaderProps = {
  rtl?: boolean;
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
};

/**
 * Text-mode reader overlay: typography panel, highlights, bookmarks, TOC.
 * Used directly for western books; wrapped by NovelReader for JP RTL.
 */
export function TextReader({
  rtl,
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
}: TextReaderProps) {
  const [sheet, setSheet] = useState<Sheet>(null);

  const handleAction = (action: ToolbarAction) => {
    switch (action) {
      case 'prev':
        // RTL flips the visual prev/next mapping so the left button advances.
        if (rtl) onNext();
        else onPrev();
        return;
      case 'next':
        if (rtl) onPrev();
        else onNext();
        return;
      case 'toc':
        setSheet((s) => (s === 'toc' ? null : 'toc'));
        return;
      case 'annotations':
        setSheet((s) => (s === 'annotations' ? null : 'annotations'));
        return;
      case 'bookmark':
        onToggleBookmark();
        return;
      case 'typography':
        setSheet((s) => (s === 'typography' ? null : 'typography'));
        return;
      case 'layout':
        onToggleLayout();
        return;
      case 'direction':
        onToggleDirection();
        return;
    }
  };

  const active =
    sheet === 'toc'
      ? 'toc'
      : sheet === 'annotations'
        ? 'annotations'
        : sheet === 'typography'
          ? 'typography'
          : isBookmarked
            ? 'bookmark'
            : null;

  return (
    <>
      <ReaderToolbar
        active={active}
        layout={layout}
        direction={direction}
        onAction={handleAction}
      />

      <TocSheet visible={sheet === 'toc'} toc={toc} onDismiss={() => setSheet(null)} onNavigate={onJumpHref} />

      <AnnotationsSheet
        visible={sheet === 'annotations'}
        bookmarks={bookmarks}
        highlights={highlights}
        onDismiss={() => setSheet(null)}
        onJumpBookmark={(b) => onJumpCfi(b.cfi)}
        onDeleteBookmark={onDeleteBookmark}
        onJumpHighlight={(h) => onJumpCfi(h.cfi)}
        onDeleteHighlight={onDeleteHighlight}
      />

      <TypographyPanel
        visible={sheet === 'typography'}
        prefs={prefs}
        onChange={onChangePrefs}
        onDismiss={() => setSheet(null)}
      />
    </>
  );
}

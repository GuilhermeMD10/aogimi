'use client';

// Fixed-layout EPUBs — manga and picture books. Same shell, fewer controls:
// there is no text to select, no typeface to choose and no page colour to set,
// because every page is an image. What Display holds instead is the page
// arrangement.
//
// Pages run right to left, so the left button advances.

import { ChevronLeft, ChevronRight, List, Search, SlidersHorizontal } from 'lucide-react';
import { ReaderIconButton, ReaderShell } from '@/features/books/reader/components/ReaderShell';
import { ContentsPanel } from '@/features/books/reader/components/ContentsPanel';
import { SettingsPanel, type ViewModeOption } from '@/features/books/reader/components/SettingsPanel';
import { useMangaReaderEngine, type ViewMode, type MangaRelocateSnapshot } from './useMangaReaderEngine';
import { MangaReaderBody } from './MangaReaderBody';

export type MangaReaderProps = {
  blob: Blob;
  bookTitle: string;
  bookAuthor?: string;
  // Accepted for interface parity with the other readers (EpubReader spreads a
  // shared prop bag), but the fixed-layout view has no text selection.
  onLookup: (word: string, contextSentence?: string) => void;
  onAddCard: (word: string, contextSentence?: string) => void;
  onBack: () => void;
  sidekickOpen?: boolean;
  onToggleSidekick?: () => void;
  /** CFI restore is not used for fixed-layout; manga restores by spine index. */
  initialCfi?: string | null;
  /** Spine index to restore to on open. */
  initialSpineIndex?: number | null;
  /** Position callback for progress sync, fired on every page turn. */
  onRelocate?: (snapshot: MangaRelocateSnapshot) => void;
};

const VIEW_MODES: ViewModeOption[] = [
  { key: 'single', label: '1', title: 'Single page' },
  { key: 'double', label: '2', title: 'Double page' },
  { key: 'scroll', label: '∞', title: 'Scroll' },
];

export function MangaReader({
  blob,
  bookTitle,
  bookAuthor,
  onBack,
  sidekickOpen = false,
  onToggleSidekick,
  initialSpineIndex,
  onRelocate,
}: MangaReaderProps) {
  const engine = useMangaReaderEngine({ blob, initialSpineIndex, onRelocate });
  const {
    currentPage,
    currentPageRef,
    total,
    viewMode,
    setViewMode,
    panel,
    setPanel,
    advancePage,
    goBackPage,
    goToPage,
    restorePageRef,
    toc,
    viewRef,
  } = engine;

  const toggle = (next: 'toc' | 'settings') => setPanel((p) => (p === next ? null : next));

  // Switching to double-page has to land on an even page or the spread pairs
  // the wrong images together.
  const changeViewMode = (key: string) => {
    const mode = key as ViewMode;
    if (mode === viewMode) return;
    let page = currentPageRef.current;
    if (mode === 'double' && page > 1 && page % 2 === 1) page -= 1;
    restorePageRef.current = page;
    setViewMode(mode);
  };

  return (
    <ReaderShell
      title={bookTitle}
      author={bookAuthor}
      onBack={onBack}
      percent={total > 0 ? (currentPage / total) * 100 : 0}
      page={{ current: currentPage, total }}
      onJumpToPage={goToPage}
      tools={
        <>
          <ReaderIconButton label="Next page" onClick={advancePage}>
            <ChevronLeft size={19} strokeWidth={1.8} />
          </ReaderIconButton>
          <ReaderIconButton label="Previous page" onClick={goBackPage}>
            <ChevronRight size={19} strokeWidth={1.8} />
          </ReaderIconButton>

          <ReaderIconButton
            label="Display settings"
            active={panel === 'settings'}
            onClick={() => toggle('settings')}
          >
            <SlidersHorizontal size={19} strokeWidth={1.8} />
          </ReaderIconButton>
          <ReaderIconButton
            label="Table of contents"
            active={panel === 'toc'}
            onClick={() => toggle('toc')}
          >
            <List size={19} strokeWidth={1.8} />
          </ReaderIconButton>

          {onToggleSidekick && (
            <ReaderIconButton
              label={sidekickOpen ? 'Hide dictionary' : 'Open dictionary'}
              active={sidekickOpen}
              onClick={onToggleSidekick}
            >
              <Search size={19} strokeWidth={1.8} />
            </ReaderIconButton>
          )}
        </>
      }
      popover={
        panel === 'toc' ? (
          <ContentsPanel
            items={toc}
            onNavigate={(href) => {
              void viewRef.current?.goTo(href);
              setPanel(null);
            }}
            onClose={() => setPanel(null)}
          />
        ) : panel === 'settings' ? (
          <SettingsPanel
            viewModes={VIEW_MODES}
            viewMode={viewMode}
            onViewModeChange={changeViewMode}
            onClose={() => setPanel(null)}
          />
        ) : undefined
      }
    >
      <MangaReaderBody engine={engine} />
    </ReaderShell>
  );
}

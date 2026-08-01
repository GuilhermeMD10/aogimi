'use client';

// Flowing EPUBs — both horizontal and vertical (縦書き), which is a Display
// setting rather than a separate reader. The toolbar is the shared shell with
// this engine's own tool cluster.

import { ChevronLeft, ChevronRight, List, Search, SlidersHorizontal } from 'lucide-react';
import { ReaderIconButton, ReaderShell } from '@/features/books/reader/components/ReaderShell';
import { ContentsPanel } from '@/features/books/reader/components/ContentsPanel';
import { SettingsPanel } from '@/features/books/reader/components/SettingsPanel';
import { useTextReaderEngine, type TextRelocateSnapshot } from './useTextReaderEngine';
import { TextReaderBody } from './TextReaderBody';

export type TextReaderProps = {
  blob: Blob;
  bookTitle: string;
  bookAuthor?: string;
  /** Seeds the writing-mode pref from the EPUB's `dir`. */
  defaultVertical?: boolean;
  onLookup: (word: string, contextSentence?: string) => void;
  onAddCard: (word: string, contextSentence?: string) => void;
  onBack: () => void;
  sidekickOpen?: boolean;
  onToggleSidekick?: () => void;
  /** CFI to restore to on open (null/undefined = start). */
  initialCfi?: string | null;
  /** Position callback for progress sync, fired on every page turn. */
  onRelocate?: (snapshot: TextRelocateSnapshot) => void;
};

export function TextReader({
  blob,
  bookTitle,
  bookAuthor,
  defaultVertical = false,
  onLookup,
  onAddCard,
  onBack,
  sidekickOpen = false,
  onToggleSidekick,
  initialCfi,
  onRelocate,
}: TextReaderProps) {
  const engine = useTextReaderEngine({ blob, defaultVertical, initialCfi, onRelocate });
  const {
    chapterLabel,
    globalPage,
    totalLocations,
    progress,
    toc,
    panel,
    setPanel,
    viewRef,
    goToPage,
    onLeftBtn,
    onRightBtn,
    vertical,
    prefs,
    savePrefs,
  } = engine;

  const toggle = (next: 'toc' | 'settings') => setPanel((p) => (p === next ? null : next));

  return (
    <ReaderShell
      title={bookTitle}
      author={bookAuthor}
      onBack={onBack}
      percent={progress}
      page={{ current: globalPage, total: totalLocations }}
      onJumpToPage={goToPage}
      tools={
        <>
          <ReaderIconButton label={vertical ? 'Next page' : 'Previous page'} onClick={onLeftBtn}>
            <ChevronLeft size={19} strokeWidth={1.8} />
          </ReaderIconButton>
          <ReaderIconButton label={vertical ? 'Previous page' : 'Next page'} onClick={onRightBtn}>
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
            currentLabel={chapterLabel}
            onNavigate={(href) => {
              void viewRef.current?.goTo(href);
              setPanel(null);
            }}
            onClose={() => setPanel(null)}
          />
        ) : panel === 'settings' ? (
          <SettingsPanel prefs={prefs} onChange={savePrefs} onClose={() => setPanel(null)} />
        ) : undefined
      }
    >
      <TextReaderBody engine={engine} onLookup={onLookup} onAddCard={onAddCard} />
    </ReaderShell>
  );
}

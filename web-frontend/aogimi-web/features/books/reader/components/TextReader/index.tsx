'use client';

// Flowing EPUBs — both horizontal and vertical (縦書き), which is a Display
// setting rather than a separate reader. The toolbar is the shared shell with
// this engine's own tool cluster.

import type { ReactNode } from 'react';
import { BookOpen, List, SlidersHorizontal } from 'lucide-react';
import { ReaderShell, type ReaderTool } from '@/features/books/reader/components/ReaderShell';
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
  /** The docked dictionary column, when open. */
  side?: ReactNode;
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
  side,
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

  // TOC · Configs · Dictionary (page 09). The Dictionary item toggles the docked
  // column (D8); the modal is reached from a selection.
  const tools: ReaderTool[] = [
    { key: 'toc', label: 'TOC', icon: <List size={16} strokeWidth={2} aria-hidden />, active: panel === 'toc', onClick: () => toggle('toc'), title: 'Table of contents' },
    { key: 'settings', label: 'Configs', icon: <SlidersHorizontal size={16} strokeWidth={2} aria-hidden />, active: panel === 'settings', onClick: () => toggle('settings'), title: 'Display settings' },
  ];
  if (onToggleSidekick) {
    tools.push({
      key: 'dictionary',
      label: 'Dictionary',
      icon: <BookOpen size={16} strokeWidth={2} aria-hidden />,
      active: sidekickOpen,
      onClick: onToggleSidekick,
      title: sidekickOpen ? 'Hide dictionary' : 'Open dictionary',
    });
  }

  return (
    <ReaderShell
      title={bookTitle}
      author={bookAuthor}
      chapter={chapterLabel}
      onBack={onBack}
      percent={progress}
      page={{ current: globalPage, total: totalLocations }}
      onJumpToPage={goToPage}
      tools={tools}
      onPrev={{ label: vertical ? 'Next page' : 'Previous page', onClick: onLeftBtn }}
      onNext={{ label: vertical ? 'Previous page' : 'Next page', onClick: onRightBtn }}
      side={side}
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

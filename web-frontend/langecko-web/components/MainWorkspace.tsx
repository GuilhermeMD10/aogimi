'use client';

import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import DictionaryView from '@/components/views/DictionaryView';
import ReaderView from '@/components/views/ReaderView';
import CardDeckView from '@/components/views/CardDeckView';
import HomeView from '@/components/home/HomeView';
import WorkspacePaneBar from '@/components/WorkspacePaneBar';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { type WorkspaceTabKey } from '@/lib/config/tab-config';
import { useWorkspaceTabs } from '@/components/providers/WorkspaceTabsProvider';
import { useReaderState } from '@/components/providers/ReaderStateProvider';
import { useDictionaryState } from '@/components/providers/DictionaryStateProvider';
import ReaderBubble from '@/components/page-bubbles/ReaderBubble';

type ReaderBubbleState =
  | { mode: 'dict' }
  | { mode: 'addCard'; word: string; back: string; contextSentence?: string };

export default function MainWorkspace() {
  const { openTabs } = useWorkspaceTabs();
  const dict = useDictionaryState();

  const { pendingDictSearch, setPendingDictSearch, pendingCard, setPendingCard } = useReaderState();
  const [readerBubble, setReaderBubble] = useState<ReaderBubbleState | null>(null);

  // ── Stable portal targets (prevents content remount on tab reorder) ──────
  const panelMountEls = useRef<Record<string, HTMLDivElement | null>>({});
  const panelMountCbs = useRef<Record<string, (el: HTMLDivElement | null) => void>>({});
  const [, setMountTick] = useState(0);

  const getPanelRef = useCallback((tab: string) => {
    if (!panelMountCbs.current[tab]) {
      panelMountCbs.current[tab] = (el) => {
        if (panelMountEls.current[tab] !== el) {
          panelMountEls.current[tab] = el;
          setMountTick((n) => n + 1);
        }
      };
    }
    return panelMountCbs.current[tab];
  }, []);

  // ── Tab content renderer ─────────────────────────────────────────────────
  const renderTabContent = useCallback(
    (tab: WorkspaceTabKey) => {
      if (tab === 'dictionary') return <DictionaryView />;
      if (tab === 'cards') return <CardDeckView />;
      return <ReaderView />;
    },
    [],
  );

  // Reader queued a dictionary lookup — push it through the shared provider so
  // both the dict tab (if open) and the bubble (if not) display the same state.
  useEffect(() => {
    if (!pendingDictSearch) return;
    void dict.runSearch(pendingDictSearch.word, pendingDictSearch.contextSentence);
    if (!openTabs.includes('dictionary')) {
      setReaderBubble({ mode: 'dict' });
    }
    setPendingDictSearch(null);
  }, [pendingDictSearch, setPendingDictSearch, openTabs, dict]);

  // Open reader bubble for card creation, or let CardDeckView handle it if cards tab is open
  useEffect(() => {
    if (!pendingCard) return;
    if (openTabs.includes('cards')) return;
    setReaderBubble({
      mode: 'addCard',
      word: pendingCard.word,
      back: pendingCard.back ?? '',
      contextSentence: pendingCard.contextSentence,
    });
    setPendingCard(null);
  }, [pendingCard, setPendingCard, openTabs]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* ── Pane bar ─────────────────────────────────────────────── */}
      <WorkspacePaneBar />

      {/* ── Content area ─────────────────────────────────────────── */}
      <div className="min-h-0 flex-1">
        {openTabs.length === 0 ? (
          <HomeView />
        ) : (
          <ResizablePanelGroup orientation="horizontal">
            {openTabs.map((tab, i) => (
              <Fragment key={tab}>
                {i > 0 && <ResizableHandle />}
                <ResizablePanel
                  id={tab}
                  defaultSize={100 / openTabs.length}
                  minSize={Math.min(20, Math.floor(90 / openTabs.length))}
                >
                  <div ref={getPanelRef(tab)} className="h-full overflow-auto" />
                </ResizablePanel>
              </Fragment>
            ))}
          </ResizablePanelGroup>
        )}
      </div>

      {/* Tab content portals — lives outside the panel tree so reorder never remounts */}
      {openTabs.map((tab) => {
        const el = panelMountEls.current[tab];
        if (!el) return null;
        return createPortal(renderTabContent(tab), el, tab);
      })}

      {/* ── Reader dictionary bubble ───────────────────────────── */}
      {readerBubble && (readerBubble.mode === 'dict' ? (
        <ReaderBubble mode="dict" onClose={() => setReaderBubble(null)} />
      ) : (
        <ReaderBubble
          key={readerBubble.word}
          mode="addCard"
          word={readerBubble.word}
          back={readerBubble.back}
          contextSentence={readerBubble.contextSentence}
          onClose={() => setReaderBubble(null)}
        />
      ))}
    </div>
  );
}

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
import ReaderBubble from '@/components/page-bubbles/ReaderBubble';

export default function MainWorkspace() {
  const { openTabs } = useWorkspaceTabs();

  const { pendingDictSearch, setPendingDictSearch, pendingCard, setPendingCard } = useReaderState();
  const [readerBubble, setReaderBubble] = useState<{
    word: string;
    contextSentence?: string;
    addCard?: boolean;
    initialBack?: string;
  } | null>(null);

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
      if (tab === 'dictionary') return <DictionaryView storageKey="modular_dictionary_state" />;
      if (tab === 'cards') return <CardDeckView />;
      return <ReaderView />;
    },
    [],
  );

  // Open reader bubble when reader queues a dictionary lookup
  // If the dictionary tab is already open, let DictionaryView handle it instead
  useEffect(() => {
    if (!pendingDictSearch) return;
    if (openTabs.includes('dictionary')) return;
    setReaderBubble({ word: pendingDictSearch.word, contextSentence: pendingDictSearch.contextSentence });
    setPendingDictSearch(null);
  }, [pendingDictSearch, setPendingDictSearch, openTabs]);

  // Open reader bubble for card creation, or let CardDeckView handle it if cards tab is open
  useEffect(() => {
    if (!pendingCard) return;
    if (openTabs.includes('cards')) return;
    setReaderBubble({
      word: pendingCard.word,
      contextSentence: pendingCard.contextSentence,
      addCard: true,
      initialBack: pendingCard.back,
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
      {readerBubble && (
        <ReaderBubble
          key={`${readerBubble.word}-${readerBubble.addCard ? 'card' : 'dict'}`}
          initialWord={readerBubble.word}
          contextSentence={readerBubble.contextSentence}
          startAtAddCard={readerBubble.addCard}
          initialBack={readerBubble.initialBack}
          onClose={() => setReaderBubble(null)}
        />
      )}
    </div>
  );
}

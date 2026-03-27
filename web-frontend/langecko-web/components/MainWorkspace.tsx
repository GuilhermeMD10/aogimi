'use client';

import { useLayoutEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import DictionaryView from '@/components/views/DictionaryView';
import EpubPdfReaderView from '@/components/views/EpubPdfReaderView';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { WORKSPACE_TAB_META, parseWorkspaceTab, type WorkspaceTabKey } from '@/components/workspace/tab-config';
import { useWorkspaceTabs } from '@/hooks/use-workspace-tabs';

function TabContent({ tab }: { tab: WorkspaceTabKey }) {
  if (tab === 'dictionary') return <DictionaryView />;
  return <EpubPdfReaderView />;
}

export default function MainWorkspace() {
  const searchParams = useSearchParams();

  const initialTabs = [searchParams.get('left'), searchParams.get('right')]
    .map(parseWorkspaceTab)
    .filter((v): v is WorkspaceTabKey => v !== null)
    .filter((v, i, arr) => arr.indexOf(v) === i);

  const {
    openTabs,
    tabsAvailableToAdd,
    canDragTabs,
    addTab,
    closeTab,
    draggedTab,
    setDraggedTab,
    dropIndex,
    clearDragState,
    setDropMarker,
    handleDropAtIndex,
  } = useWorkspaceTabs(initialTabs);

  // elementRef gives us the outer flex item div (not the inner content div).
  // style prop on ResizablePanel only reaches the inner div, so CSS order must
  // be set imperatively here to actually affect the flex layout.
  const dictOuterRef = useRef<HTMLDivElement>(null);
  const readerOuterRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (openTabs.length !== 2) return;
    if (dictOuterRef.current) dictOuterRef.current.style.order = String(openTabs.indexOf('dictionary') * 2);
    if (readerOuterRef.current) readerOuterRef.current.style.order = String(openTabs.indexOf('reader') * 2);
  }, [openTabs]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-9 shrink-0 items-center gap-2 border-b border-lumina-border-divider px-2">
        <div className="flex min-w-0 items-center">
          {openTabs.length > 0 ? (
            openTabs.map((tabKey, index) => (
              <div key={tabKey} className="flex items-center">
                {index === 0 ? (
                  <div
                    className="relative flex h-8 w-2 items-center justify-center"
                    onDragOver={(event) => {
                      if (!canDragTabs || !draggedTab) return;
                      event.preventDefault();
                      event.dataTransfer.dropEffect = 'move';
                      setDropMarker(0);
                    }}
                    onDrop={(event) => handleDropAtIndex(event, 0)}
                  >
                    {dropIndex === 0 ? (
                      <span className="pointer-events-none h-5 w-0.5 bg-lumina-primary-teal" />
                    ) : null}
                  </div>
                ) : null}

                <div
                  draggable={canDragTabs}
                  onDragStart={(event) => {
                    setDraggedTab(tabKey);
                    event.dataTransfer.effectAllowed = 'move';
                    event.dataTransfer.setData('text/plain', tabKey);
                  }}
                  onDragOver={(event) => {
                    if (!canDragTabs || !draggedTab) return;
                    event.preventDefault();
                    event.dataTransfer.dropEffect = 'move';
                    const rect = event.currentTarget.getBoundingClientRect();
                    setDropMarker(event.clientX < rect.left + rect.width / 2 ? index : index + 1);
                  }}
                  onDrop={handleDropAtIndex}
                  onDragEnd={clearDragState}
                  className={`relative flex items-center gap-1 rounded border border-lumina-border-divider px-2 py-1 transition-colors ${
                    draggedTab === tabKey ? 'opacity-60' : ''
                  }`}
                >
                  <span className="truncate text-xs font-medium text-black">
                    {WORKSPACE_TAB_META[tabKey].label}
                  </span>
                  <button
                    type="button"
                    onClick={() => closeTab(tabKey)}
                    draggable={false}
                    className="rounded px-1 text-xs leading-none text-black hover:bg-black/5"
                    aria-label={`Close ${WORKSPACE_TAB_META[tabKey].label}`}
                  >
                    X
                  </button>
                </div>

                <div
                  className="relative flex h-8 w-2 items-center justify-center"
                  onDragOver={(event) => {
                    if (!canDragTabs || !draggedTab) return;
                    event.preventDefault();
                    event.dataTransfer.dropEffect = 'move';
                    setDropMarker(index + 1);
                  }}
                  onDrop={(event) => handleDropAtIndex(event, index + 1)}
                >
                  {dropIndex === index + 1 ? (
                    <span className="pointer-events-none h-5 w-0.5 bg-lumina-primary-teal" />
                  ) : null}
                </div>
              </div>
            ))
          ) : (
            <span className="text-xs text-black">No open tabs</span>
          )}
        </div>

        <button
          type="button"
          onClick={addTab}
          disabled={tabsAvailableToAdd.length === 0}
          className="ml-auto h-7 w-7 rounded border border-lumina-border-divider text-sm font-medium text-black hover:bg-black/5 disabled:opacity-40 disabled:hover:bg-transparent"
          aria-label={
            tabsAvailableToAdd.length > 0
              ? `Add ${WORKSPACE_TAB_META[tabsAvailableToAdd[0]].label}`
              : 'No available tabs to add'
          }
        >
          +
        </button>
      </div>

      <div className="min-h-0 flex-1">
        {openTabs.length === 2 ? (
          <ResizablePanelGroup orientation="horizontal">
            <ResizablePanel elementRef={dictOuterRef} defaultSize={50} minSize={30}>
              <div className="h-full overflow-auto">
                <DictionaryView />
              </div>
            </ResizablePanel>
            <ResizableHandle style={{ order: 1 }} />
            <ResizablePanel elementRef={readerOuterRef} defaultSize={50} minSize={30}>
              <div className="h-full overflow-auto">
                <EpubPdfReaderView />
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        ) : openTabs.length === 1 ? (
          <div className="h-full overflow-auto">
            <TabContent tab={openTabs[0]} />
          </div>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-black">
            No window is open.
          </div>
        )}
      </div>
    </div>
  );
}

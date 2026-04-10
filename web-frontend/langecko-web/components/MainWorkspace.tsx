'use client';

import { Fragment, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import DictionaryView from '@/components/views/DictionaryView';
import EpubPdfReaderView from '@/components/views/EpubPdfReaderView';
import CardDeckView from '@/components/views/CardDeckView';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import {
  WORKSPACE_TAB_META,
  WORKSPACE_TAB_ORDER,
  parseWorkspaceTab,
  type WorkspaceTabKey,
} from '@/lib/config/tab-config';
import { useWorkspaceTabs } from '@/hooks/use-workspace-tabs';
import { useReaderState } from '@/components/providers/ReaderStateProvider';

const LAYOUT_STORAGE_KEY = 'modular_layout';

function TabContent({ tab }: { tab: WorkspaceTabKey }) {
  if (tab === 'dictionary') return <DictionaryView storageKey="modular_dictionary_state" />;
  if (tab === 'cards') return <CardDeckView storageKey="modular_cards_state" />;
  return <EpubPdfReaderView />;
}

export default function MainWorkspace() {
  const searchParams = useSearchParams();

  const tabsFromUrl = [searchParams.get('left'), searchParams.get('right')]
    .map(parseWorkspaceTab)
    .filter((v): v is WorkspaceTabKey => v !== null)
    .filter((v, i, arr) => arr.indexOf(v) === i);

  const hasUrlTabs = tabsFromUrl.length > 0;

  const {
    openTabs,
    setOpenTabs,
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
  } = useWorkspaceTabs(tabsFromUrl);

  const layoutSaveReadyRef = useRef(false);
  const [addPickerOpen, setAddPickerOpen] = useState(false);
  const addPickerRef = useRef<HTMLDivElement>(null);

  const { pendingDictSearch, pendingCardWord } = useReaderState();

  // Ensure the relevant tab is open whenever the reader queues a cross-tab action.
  useEffect(() => {
    if (pendingDictSearch && !openTabs.includes('dictionary')) addTab('dictionary');
  }, [pendingDictSearch, openTabs, addTab]);

  useEffect(() => {
    if (pendingCardWord && !openTabs.includes('cards')) addTab('cards');
  }, [pendingCardWord, openTabs, addTab]);

  // Load layout from localStorage when no URL params
  useEffect(() => {
    if (hasUrlTabs) return;
    try {
      const raw = localStorage.getItem(LAYOUT_STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as WorkspaceTabKey[];
      if (Array.isArray(saved) && saved.length > 0) {
        const valid = saved.filter((k) => parseWorkspaceTab(k) !== null) as WorkspaceTabKey[];
        if (valid.length > 0) setOpenTabs(valid);
      }
    } catch { /* ignore */ }
  }, [hasUrlTabs, setOpenTabs]);

  // Save layout to localStorage
  useEffect(() => {
    if (!layoutSaveReadyRef.current) { layoutSaveReadyRef.current = true; return; }
    try {
      localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(openTabs));
    } catch { /* ignore */ }
  }, [openTabs]);

  // Close picker on outside click
  useEffect(() => {
    if (!addPickerOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (addPickerRef.current && !addPickerRef.current.contains(event.target as Node)) {
        setAddPickerOpen(false);
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [addPickerOpen]);

  return (
    <div className="flex h-full min-h-0 flex-col">

      {/* Tab bar — only shown when at least one tab is open */}
      {openTabs.length > 0 ? (
        <div className="flex h-9 shrink-0 items-center gap-2 border-b border-lumina-border-divider px-2">
          <div className="flex min-w-0 flex-1 items-center">
            {openTabs.map((tabKey, index) => (
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
                  <span className="truncate text-xs font-medium text-lumina-primary-text">
                    {WORKSPACE_TAB_META[tabKey].label}
                  </span>
                  <button
                    type="button"
                    onClick={() => closeTab(tabKey)}
                    draggable={false}
                    className="rounded px-1 text-xs leading-none text-lumina-primary-text hover:bg-black/5"
                    aria-label={`Close ${WORKSPACE_TAB_META[tabKey].label}`}
                  >
                    ✕
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
            ))}
          </div>

          {/* Add tab button + picker */}
          <div ref={addPickerRef} className="relative ml-auto shrink-0">
            <button
              type="button"
              onClick={() => setAddPickerOpen((v) => !v)}
              disabled={tabsAvailableToAdd.length === 0}
              className="h-7 w-7 rounded border border-lumina-border-divider text-sm font-medium text-lumina-primary-text hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
              aria-label={tabsAvailableToAdd.length > 0 ? 'Add a view' : 'All views are open'}
            >
              +
            </button>

            {addPickerOpen && tabsAvailableToAdd.length > 0 ? (
              <div className="absolute right-0 top-full z-50 mt-1 min-w-36 rounded border border-lumina-border-divider bg-white py-1 shadow-md">
                {tabsAvailableToAdd.map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      addTab(key);
                      setAddPickerOpen(false);
                    }}
                    className="flex w-full items-center px-3 py-2 text-sm text-lumina-primary-text hover:bg-black/5"
                  >
                    {WORKSPACE_TAB_META[key].label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* Content area */}
      <div className="min-h-0 flex-1">
        {openTabs.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-4">
            <p className="text-sm text-lumina-secondary-text">Open a view to get started</p>
            <div className="flex gap-2">
              {WORKSPACE_TAB_ORDER.map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => addTab(key)}
                  className="rounded border border-lumina-border-divider bg-white px-4 py-2 text-sm font-medium text-lumina-primary-text hover:bg-black/5"
                >
                  {WORKSPACE_TAB_META[key].label}
                </button>
              ))}
            </div>
          </div>
        ) : openTabs.length === 1 ? (
          <div className="h-full overflow-auto">
            <TabContent tab={openTabs[0]} />
          </div>
        ) : (
          <ResizablePanelGroup orientation="horizontal">
            {openTabs.map((tab, i) => (
              <Fragment key={tab}>
                {i > 0 ? <ResizableHandle /> : null}
                <ResizablePanel
                  id={tab}
                  defaultSize={100 / openTabs.length}
                  minSize={20}
                >
                  <div className="h-full overflow-auto">
                    <TabContent tab={tab} />
                  </div>
                </ResizablePanel>
              </Fragment>
            ))}
          </ResizablePanelGroup>
        )}
      </div>
    </div>
  );
}

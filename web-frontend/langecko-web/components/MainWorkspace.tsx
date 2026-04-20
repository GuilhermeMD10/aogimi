'use client';

import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Plus, Columns3, Star, X } from 'lucide-react';
import LibraryView from '@/components/views/LibraryView';
import DictionaryView from '@/components/views/DictionaryView';
import ReaderView from '@/components/views/ReaderView';
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
import WorkspaceNav, { type BubbleKey } from '@/components/WorkspaceNav';
import ProfileBubble from '@/components/ProfileBubble';
import { getBookFile, ensureBackendBook, type BookRecord } from '@/lib/bookStore';
import { getUserBooks } from '@/lib/booksApi';
import { useAuth } from '@/components/providers/AuthProvider';

const LAYOUT_STORAGE_KEY = 'modular_layout';
const DEFAULT_TABS: WorkspaceTabKey[] = ['library'];

export default function MainWorkspace() {
  const searchParams = useSearchParams();
  const { user } = useAuth();

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
  } = useWorkspaceTabs(tabsFromUrl.length > 0 ? tabsFromUrl : DEFAULT_TABS);

  const layoutSaveReadyRef = useRef(false);
  const [addPickerOpen, setAddPickerOpen] = useState(false);
  const addPickerRef = useRef<HTMLDivElement>(null);
  const [activeBubble, setActiveBubble] = useState<BubbleKey | null>(null);

  const {
    pendingDictSearch,
    pendingCard,
    setReaderSession,
    readerSession,
  } = useReaderState();

  // ── Open a book from LibraryView → reader tab ────────────────────────────
  const blobUrlRef = useRef<string | null>(null);

  const handleOpenBook = useCallback(async (book: BookRecord) => {
    try {
      const arrayBuffer = await getBookFile(book.id);
      if (!arrayBuffer) return;

      // Revoke previous blob URL
      if (blobUrlRef.current && blobUrlRef.current !== readerSession?.fileUrl) {
        URL.revokeObjectURL(blobUrlRef.current);
      }

      const url = URL.createObjectURL(new Blob([arrayBuffer], { type: 'application/epub+zip' }));
      blobUrlRef.current = url;

      setReaderSession({
        activeBook: book,
        fileUrl: url,
        backendBookId: null,
        backendCfi: null,
      });

      // Ensure reader tab is open
      if (!openTabs.includes('reader')) {
        addTab('reader');
      }

      // Resolve backend record for progress sync
      if (user) {
        try {
          const remote = await getUserBooks(user.id);
          const match = remote.find((b) => b.filename === book.filename);
          if (match) {
            setReaderSession((prev) =>
              prev ? { ...prev, backendBookId: match.id, backendCfi: match.cfi_position } : prev,
            );
          } else {
            const created = await ensureBackendBook(book, user.id);
            setReaderSession((prev) =>
              prev ? { ...prev, backendBookId: created.id } : prev,
            );
          }
        } catch { /* backend unavailable */ }
      }
    } catch { /* failed to open */ }
  }, [openTabs, addTab, setReaderSession, readerSession?.fileUrl, user]);

  // ── Nav bar: toggle workspace tab ─────────────────────────────────────────
  const handleToggleTab = useCallback((tab: WorkspaceTabKey) => {
    if (openTabs.includes(tab)) {
      closeTab(tab);
    } else {
      addTab(tab);
    }
  }, [openTabs, closeTab, addTab]);

  // ── Nav bar: toggle bubble ───────────────────────────────────────────────
  const handleToggleBubble = useCallback((key: BubbleKey) => {
    setActiveBubble(prev => prev === key ? null : key);
  }, []);

  // ── Tab content renderer ─────────────────────────────────────────────────
  const renderTabContent = useCallback((tab: WorkspaceTabKey) => {
    if (tab === 'library') return <LibraryView onOpenBook={handleOpenBook} />;
    if (tab === 'dictionary') return <DictionaryView storageKey="modular_dictionary_state" />;
    if (tab === 'cards') return <CardDeckView />;
    return <ReaderView />;
  }, [handleOpenBook]);

  // Auto-open tab when reader queues a cross-tab action
  useEffect(() => {
    if (pendingDictSearch && !openTabs.includes('dictionary')) addTab('dictionary');
  }, [pendingDictSearch, openTabs, addTab]);

  useEffect(() => {
    if (pendingCard && !openTabs.includes('cards')) addTab('cards');
  }, [pendingCard, openTabs, addTab]);

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

      {/* ── Pane bar ─────────────────────────────────────────────── */}
      {openTabs.length > 0 && (
        <div className="lgc-panebar" style={{ padding: '8px 12px' }}>
          {/* "Panes" label */}
          <span className="select-none text-[10px] font-semibold uppercase tracking-widest text-lgc-fg-muted" style={{ marginRight: 4 }}>
            Panes
          </span>

          {/* Chips + arrows */}
          {openTabs.map((tabKey, index) => {
            const meta = WORKSPACE_TAB_META[tabKey];
            const Icon = meta.icon;
            const isDragged = draggedTab === tabKey;

            return (
              <Fragment key={tabKey}>
                {/* Arrow between chips */}
                {index > 0 && <span className="lgc-panearrow">⇄</span>}

                {/* Drop zone before this chip */}
                <div
                  className="relative flex h-8 w-1 items-center justify-center"
                  onDragOver={(e) => {
                    if (!canDragTabs || !draggedTab) return;
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                    setDropMarker(index);
                  }}
                  onDrop={(e) => handleDropAtIndex(e, index)}
                >
                  {dropIndex === index && (
                    <span className="pointer-events-none absolute h-6 w-0.5 rounded-full bg-lgc-accent" />
                  )}
                </div>

                {/* Chip */}
                <div
                  draggable={canDragTabs}
                  onDragStart={(e) => {
                    setDraggedTab(tabKey);
                    e.dataTransfer.effectAllowed = 'move';
                    e.dataTransfer.setData('text/plain', tabKey);
                  }}
                  onDragOver={(e) => {
                    if (!canDragTabs || !draggedTab) return;
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                    const rect = e.currentTarget.getBoundingClientRect();
                    setDropMarker(e.clientX < rect.left + rect.width / 2 ? index : index + 1);
                  }}
                  onDrop={handleDropAtIndex}
                  onDragEnd={clearDragState}
                  className={`lgc-panechip ${isDragged ? 'lgc-panechip-ghost' : ''}`}
                >
                  <span className="lgc-panechip-dot" style={{ background: meta.dot }} />
                  <Icon size={12} className="text-lgc-fg-muted" />
                  <span className="text-[12px] font-medium">{meta.label}</span>
                  <button
                    type="button"
                    onClick={() => closeTab(tabKey)}
                    draggable={false}
                    className="ml-1 flex h-4 w-4 items-center justify-center rounded-full text-lgc-fg-subtle transition-colors hover:bg-lgc-bg-sunken hover:text-lgc-fg"
                    aria-label={`Close ${meta.label}`}
                  >
                    <X size={9} />
                  </button>
                </div>
              </Fragment>
            );
          })}

          {/* Drop zone after last chip */}
          <div
            className="relative flex h-8 w-1 items-center justify-center"
            onDragOver={(e) => {
              if (!canDragTabs || !draggedTab) return;
              e.preventDefault();
              e.dataTransfer.dropEffect = 'move';
              setDropMarker(openTabs.length);
            }}
            onDrop={(e) => handleDropAtIndex(e, openTabs.length)}
          >
            {dropIndex === openTabs.length && (
              <span className="pointer-events-none absolute h-6 w-0.5 rounded-full bg-lgc-accent" />
            )}
          </div>

          {/* Add pane button + picker */}
          <div ref={addPickerRef} className="relative">
            <button
              type="button"
              onClick={() => setAddPickerOpen((v) => !v)}
              disabled={tabsAvailableToAdd.length === 0}
              className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-lgc-fg-muted transition-colors hover:bg-lgc-bg-sunken hover:text-lgc-fg disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Plus size={11} /> Add pane
            </button>

            {addPickerOpen && tabsAvailableToAdd.length > 0 && (
              <div className="absolute left-0 top-full z-50 mt-1.5 min-w-40 overflow-hidden rounded-lg border border-lgc-border-strong bg-lgc-bg-elev py-1 shadow-[0_8px_24px_-6px_rgba(0,0,0,0.12)]">
                {tabsAvailableToAdd.map((key) => {
                  const m = WORKSPACE_TAB_META[key];
                  const TabIcon = m.icon;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => { addTab(key); setAddPickerOpen(false); }}
                      className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[12px] text-lgc-fg transition-colors hover:bg-lgc-bg-sunken"
                    >
                      <span className="h-2 w-2 rounded-full" style={{ background: m.dot }} />
                      <TabIcon size={12} className="text-lgc-fg-muted" />
                      {m.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right-side placeholder buttons */}
          <div className="ml-auto flex gap-1">
            <button
              type="button"
              disabled
              className="flex h-7.5 w-7.5 items-center justify-center rounded-md text-lgc-fg-subtle opacity-40"
              title="Layouts"
            >
              <Columns3 size={13} />
            </button>
            <button
              type="button"
              disabled
              className="flex h-7.5 w-7.5 items-center justify-center rounded-md text-lgc-fg-subtle opacity-40"
              title="Save workspace"
            >
              <Star size={13} />
            </button>
          </div>
        </div>
      )}

      {/* ── Content area ─────────────────────────────────────────── */}
      <div className="min-h-0 flex-1">
        {openTabs.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-5">
            <div className="text-center">
              <p className="text-sm font-medium text-lgc-fg">Open a pane to get started</p>
              <p className="mt-1 text-xs text-lgc-fg-muted">Choose a view below or use the keyboard</p>
            </div>
            <div className="flex gap-2.5">
              {WORKSPACE_TAB_ORDER.map((key) => {
                const m = WORKSPACE_TAB_META[key];
                const TabIcon = m.icon;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => addTab(key)}
                    className="lgc-card flex items-center gap-2.5 px-4 py-2.5 text-[12.5px] font-medium text-lgc-fg transition-shadow hover:shadow-md"
                  >
                    <span className="h-2 w-2 rounded-full" style={{ background: m.dot }} />
                    <TabIcon size={13} className="text-lgc-fg-muted" />
                    {m.label}
                  </button>
                );
              })}
            </div>
          </div>
        ) : openTabs.length === 1 ? (
          <div className="h-full overflow-auto">
            {renderTabContent(openTabs[0])}
          </div>
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
                  <div className="h-full overflow-auto">
                    {renderTabContent(tab)}
                  </div>
                </ResizablePanel>
              </Fragment>
            ))}
          </ResizablePanelGroup>
        )}
      </div>

      {/* ── Bottom navigation bar ───────────────────────────────── */}
      <WorkspaceNav
        openTabs={openTabs}
        onToggleTab={handleToggleTab}
        activeBubble={activeBubble}
        onToggleBubble={handleToggleBubble}
      />

      {/* ── Profile bubble ──────────────────────────────────────── */}
      {activeBubble === 'profile' && (
        <ProfileBubble onClose={() => setActiveBubble(null)} />
      )}
    </div>
  );
}

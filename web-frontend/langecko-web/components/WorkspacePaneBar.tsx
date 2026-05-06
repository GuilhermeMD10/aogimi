'use client';

import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import { Columns3, Plus, Star, X } from 'lucide-react';
import { WORKSPACE_TAB_META } from '@/lib/config/tab-config';
import { useWorkspaceTabs } from '@/components/providers/WorkspaceTabsProvider';

// Pointer-events-based reorder bar.
//
// The drop position is computed from the cursor's clientX against every chip's
// midpoint. As long as the cursor is somewhere over the bar (or anywhere — we
// use pointer capture), the drop index updates. There are no thin invisible
// drop zones, so dragging "past" any chip on either side just works.

type DragState = {
  sourceIndex: number;
  pointerId: number;
  /** clientX at pointerdown; used to compute translation + movement threshold. */
  startX: number;
  /** Live cursor X. */
  cursorX: number;
  /** True once the cursor has moved past DRAG_THRESHOLD_PX from startX. */
  hasMoved: boolean;
  /** Where the chip would land on release (between-positions: 0..openTabs.length). */
  dropIndex: number;
};

const DRAG_THRESHOLD_PX = 4;

export default function WorkspacePaneBar() {
  const {
    openTabs,
    tabsAvailableToAdd,
    canDragTabs,
    addTab,
    closeTab,
    reorderTab,
  } = useWorkspaceTabs();

  const chipRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [addPickerOpen, setAddPickerOpen] = useState(false);
  const addPickerRef = useRef<HTMLDivElement>(null);

  // Keep the chip ref array length in sync with openTabs.
  if (chipRefs.current.length > openTabs.length) {
    chipRefs.current.length = openTabs.length;
  }
  while (chipRefs.current.length < openTabs.length) chipRefs.current.push(null);

  /** Find the gap (0..length) whose midpoint cursorX is closest to "before". */
  const computeDropIndex = useCallback((cursorX: number) => {
    for (let i = 0; i < chipRefs.current.length; i++) {
      const r = chipRefs.current[i]?.getBoundingClientRect();
      if (r && cursorX < r.left + r.width / 2) return i;
    }
    return chipRefs.current.length;
  }, []);

  const onChipPointerDown = useCallback(
    (index: number) => (e: React.PointerEvent<HTMLDivElement>) => {
      if (!canDragTabs || e.button !== 0) return;
      // Don't start drag from interactive children (the close-X button).
      const target = e.target as HTMLElement;
      if (target.closest('button')) return;
      const chipEl = chipRefs.current[index];
      if (!chipEl) return;
      // Capture the pointer so we keep getting move/up events even if the
      // cursor leaves the chip — including over the panel content below.
      chipEl.setPointerCapture(e.pointerId);
      setDragState({
        sourceIndex: index,
        pointerId: e.pointerId,
        startX: e.clientX,
        cursorX: e.clientX,
        hasMoved: false,
        dropIndex: index,
      });
    },
    [canDragTabs],
  );

  const onChipPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      setDragState((prev) => {
        if (!prev || prev.pointerId !== e.pointerId) return prev;
        const moved = prev.hasMoved || Math.abs(e.clientX - prev.startX) > DRAG_THRESHOLD_PX;
        const dropIndex = moved ? computeDropIndex(e.clientX) : prev.dropIndex;
        return { ...prev, cursorX: e.clientX, hasMoved: moved, dropIndex };
      });
    },
    [computeDropIndex],
  );

  const finishDrag = useCallback(
    (commit: boolean) => {
      setDragState((prev) => {
        if (!prev) return prev;
        const chipEl = chipRefs.current[prev.sourceIndex];
        try { chipEl?.releasePointerCapture(prev.pointerId); } catch { /* already released */ }
        if (
          commit &&
          prev.hasMoved &&
          prev.dropIndex !== prev.sourceIndex &&
          prev.dropIndex !== prev.sourceIndex + 1
        ) {
          reorderTab(prev.sourceIndex, prev.dropIndex);
        }
        return null;
      });
    },
    [reorderTab],
  );

  const onChipPointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (dragState?.pointerId !== e.pointerId) return;
      finishDrag(true);
    },
    [dragState?.pointerId, finishDrag],
  );

  const onChipPointerCancel = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (dragState?.pointerId !== e.pointerId) return;
      finishDrag(false);
    },
    [dragState?.pointerId, finishDrag],
  );

  // Cancel with Escape.
  useEffect(() => {
    if (!dragState) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') finishDrag(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [dragState, finishDrag]);

  // While actively dragging, force grabbing cursor + suppress text selection.
  useEffect(() => {
    if (!dragState?.hasMoved) return;
    const prevCursor = document.body.style.cursor;
    const prevSelect = document.body.style.userSelect;
    document.body.style.cursor = 'grabbing';
    document.body.style.userSelect = 'none';
    return () => {
      document.body.style.cursor = prevCursor;
      document.body.style.userSelect = prevSelect;
    };
  }, [dragState?.hasMoved]);

  // Close add-pane picker on outside click.
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

  if (openTabs.length === 0) return null;

  // An indicator at gap `i` is only meaningful when it would actually move the
  // dragged chip — i.e. not at sourceIndex (the chip's current left edge) or
  // sourceIndex+1 (its current right edge).
  const showIndicatorAt = (i: number): boolean => {
    if (!dragState?.hasMoved) return false;
    if (dragState.dropIndex !== i) return false;
    return i !== dragState.sourceIndex && i !== dragState.sourceIndex + 1;
  };

  return (
    <div className="lgc-panebar" style={{ padding: '8px 12px' }}>
      <span
        className="select-none text-[10px] font-semibold uppercase tracking-widest text-lgc-fg-muted"
        style={{ marginRight: 4 }}
      >
        Panes
      </span>

      {showIndicatorAt(0) && <DropIndicator />}

      {openTabs.map((tabKey, index) => {
        const meta = WORKSPACE_TAB_META[tabKey];
        const Icon = meta.icon;
        const isDragged = dragState?.sourceIndex === index;
        const cursorOffset =
          isDragged && dragState?.hasMoved ? dragState.cursorX - dragState.startX : 0;

        return (
          <Fragment key={tabKey}>
            {/* Arrow between chips, only when a drop indicator isn't taking that slot. */}
            {index > 0 && !showIndicatorAt(index) && (
              <span className="lgc-panearrow">⇄</span>
            )}

            <div
              ref={(el) => { chipRefs.current[index] = el; }}
              onPointerDown={onChipPointerDown(index)}
              onPointerMove={isDragged ? onChipPointerMove : undefined}
              onPointerUp={isDragged ? onChipPointerUp : undefined}
              onPointerCancel={isDragged ? onChipPointerCancel : undefined}
              className={`lgc-panechip ${isDragged && dragState?.hasMoved ? 'lgc-panechip-ghost' : ''}`}
              style={{
                transform: cursorOffset !== 0 ? `translateX(${cursorOffset}px)` : undefined,
                transition: isDragged ? 'none' : undefined,
                zIndex: isDragged ? 10 : undefined,
                touchAction: 'none',
              }}
            >
              <span className="lgc-panechip-dot" style={{ background: meta.dot }} />
              <Icon size={12} className="text-lgc-fg-muted" />
              <span className="text-[12px] font-medium">{meta.label}</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  closeTab(tabKey);
                }}
                onPointerDown={(e) => e.stopPropagation()}
                className="ml-1 flex h-4 w-4 items-center justify-center rounded-full text-lgc-fg-subtle transition-colors hover:bg-lgc-bg-sunken hover:text-lgc-fg"
                aria-label={`Close ${meta.label}`}
              >
                <X size={9} />
              </button>
            </div>

            {showIndicatorAt(index + 1) && <DropIndicator />}
          </Fragment>
        );
      })}

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
  );
}

function DropIndicator() {
  return (
    <span
      aria-hidden
      className="pointer-events-none mx-0.5 inline-block h-6 w-0.5 rounded-full bg-lgc-accent"
    />
  );
}

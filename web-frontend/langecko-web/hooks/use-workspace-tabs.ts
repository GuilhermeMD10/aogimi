import { useCallback, useMemo, useState, type DragEvent } from 'react';
import {
  MAX_MODULAR_TABS,
  WORKSPACE_TAB_ORDER,
  parseWorkspaceTab,
  type WorkspaceTabKey,
} from '@/lib/config/tab-config';

export function useWorkspaceTabs(initialTabs: WorkspaceTabKey[]) {
  const [openTabs, setOpenTabs] = useState<WorkspaceTabKey[]>(initialTabs);
  const [draggedTab, setDraggedTab] = useState<WorkspaceTabKey | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);

  const tabsAvailableToAdd = useMemo(
    () => WORKSPACE_TAB_ORDER.filter((key) => !openTabs.includes(key)),
    [openTabs],
  );

  const canDragTabs = openTabs.length > 1;

  const addTab = useCallback((tab: WorkspaceTabKey): boolean => {
    let added = false;
    setOpenTabs((tabs) => {
      if (tabs.includes(tab) || tabs.length >= MAX_MODULAR_TABS) return tabs;
      added = true;
      return [...tabs, tab];
    });
    return added;
  }, []);

  const closeTab = useCallback((tabToClose: WorkspaceTabKey) => {
    setOpenTabs((tabs) => tabs.filter((key) => key !== tabToClose));
    setDraggedTab((prev) => (prev === tabToClose ? null : prev));
    setDropIndex(null);
  }, []);

  const clearDragState = useCallback(() => {
    setDraggedTab(null);
    setDropIndex(null);
  }, []);

  const reorderTabs = useCallback((sourceTab: WorkspaceTabKey, targetIndex: number) => {
    setOpenTabs((tabs) => {
      if (tabs.length < 2) return tabs;

      const sourceIndex = tabs.indexOf(sourceTab);
      if (sourceIndex === -1) return tabs;

      const clamped = Math.max(0, Math.min(targetIndex, tabs.length));
      if (clamped === sourceIndex || clamped === sourceIndex + 1) return tabs;

      const next = [...tabs];
      next.splice(sourceIndex, 1);
      next.splice(sourceIndex < clamped ? clamped - 1 : clamped, 0, sourceTab);
      return next;
    });
  }, []);

  const setDropMarker = useCallback((nextIndex: number) => {
    if (!canDragTabs || !draggedTab) return;

    const sourceIndex = openTabs.indexOf(draggedTab);
    if (sourceIndex === -1) return;

    if (nextIndex === sourceIndex || nextIndex === sourceIndex + 1) {
      setDropIndex(null);
      return;
    }

    setDropIndex(nextIndex);
  }, [canDragTabs, draggedTab, openTabs]);

  const handleDropAtIndex = useCallback((event: DragEvent<HTMLElement>, forcedIndex?: number) => {
    event.preventDefault();
    // Always read the tab from dataTransfer as ground truth — draggedTab state
    // may have cleared if the drag left the window boundary.
    const sourceTab = parseWorkspaceTab(event.dataTransfer.getData('text/plain')) ?? draggedTab;
    const targetIndex = forcedIndex ?? dropIndex;

    if (!sourceTab || targetIndex === null) {
      clearDragState();
      return;
    }

    reorderTabs(sourceTab, targetIndex);
    clearDragState();
  }, [draggedTab, dropIndex, reorderTabs, clearDragState]);

  return {
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
  };
}

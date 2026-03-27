import { useMemo, useState, type DragEvent } from 'react';
import {
  MAX_MODULAR_TABS,
  WORKSPACE_TAB_ORDER,
  parseWorkspaceTab,
  type WorkspaceTabKey,
} from '@/components/workspace/tab-config';

export function useWorkspaceTabs(initialTabs: WorkspaceTabKey[]) {
  const [openTabs, setOpenTabs] = useState<WorkspaceTabKey[]>(initialTabs);
  const [draggedTab, setDraggedTab] = useState<WorkspaceTabKey | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);

  const tabsAvailableToAdd = useMemo(
    () => WORKSPACE_TAB_ORDER.filter((key) => !openTabs.includes(key)),
    [openTabs],
  );

  const canDragTabs = openTabs.length > 1;

  const addTab = () => {
    if (tabsAvailableToAdd.length === 0 || openTabs.length >= MAX_MODULAR_TABS) return;
    setOpenTabs((tabs) => [...tabs, tabsAvailableToAdd[0]]);
  };

  const closeTab = (tabToClose: WorkspaceTabKey) => {
    setOpenTabs((tabs) => tabs.filter((key) => key !== tabToClose));
    if (draggedTab === tabToClose) setDraggedTab(null);
    setDropIndex(null);
  };

  const clearDragState = () => {
    setDraggedTab(null);
    setDropIndex(null);
  };

  const reorderTabs = (sourceTab: WorkspaceTabKey, targetIndex: number) => {
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
  };

  const setDropMarker = (nextIndex: number) => {
    if (!canDragTabs || !draggedTab) return;

    const sourceIndex = openTabs.indexOf(draggedTab);
    if (sourceIndex === -1) return;

    if (nextIndex === sourceIndex || nextIndex === sourceIndex + 1) {
      setDropIndex(null);
      return;
    }

    setDropIndex(nextIndex);
  };

  const handleDropAtIndex = (event: DragEvent<HTMLElement>, forcedIndex?: number) => {
    event.preventDefault();
    const sourceTab = draggedTab ?? parseWorkspaceTab(event.dataTransfer.getData('text/plain'));
    const targetIndex = forcedIndex ?? dropIndex;

    if (!sourceTab || targetIndex === null) {
      clearDragState();
      return;
    }

    reorderTabs(sourceTab, targetIndex);
    clearDragState();
  };

  return {
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
  };
}

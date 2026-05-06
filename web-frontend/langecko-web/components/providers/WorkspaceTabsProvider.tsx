'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  MAX_MODULAR_TABS,
  WORKSPACE_TAB_ORDER,
  parseWorkspaceTab,
  type WorkspaceTabKey,
} from '@/lib/config/tab-config';

const STORAGE_KEY = 'modular_layout';
const DEFAULT_TABS: WorkspaceTabKey[] = ['reader'];

type WorkspaceTabsContextValue = {
  openTabs: WorkspaceTabKey[];
  setOpenTabs: React.Dispatch<React.SetStateAction<WorkspaceTabKey[]>>;
  tabsAvailableToAdd: WorkspaceTabKey[];
  canDragTabs: boolean;
  addTab: (tab: WorkspaceTabKey) => boolean;
  closeTab: (tab: WorkspaceTabKey) => void;
  toggleTab: (tab: WorkspaceTabKey) => void;
  /**
   * Move the chip at `sourceIndex` so that, after removal, it lands at
   * `targetIndex` in the resulting array. (`targetIndex` uses the
   * "between-positions" convention: 0 = before first, length = after last.)
   * No-ops when source/target collide.
   */
  reorderTab: (sourceIndex: number, targetIndex: number) => void;
};

const WorkspaceTabsContext = createContext<WorkspaceTabsContextValue | null>(null);

export function WorkspaceTabsProvider({ children }: { children: React.ReactNode }) {
  const [openTabs, setOpenTabs] = useState<WorkspaceTabKey[]>(DEFAULT_TABS);
  const persistReadyRef = useRef(false);

  // Hydrate from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as WorkspaceTabKey[];
        if (Array.isArray(saved)) {
          const valid = saved.filter((k) => parseWorkspaceTab(k) !== null) as WorkspaceTabKey[];
          if (valid.length > 0) setOpenTabs(valid);
        }
      }
    } catch { /* ignore */ }
    persistReadyRef.current = true;
  }, []);

  // Persist
  useEffect(() => {
    if (!persistReadyRef.current) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(openTabs));
    } catch { /* ignore */ }
  }, [openTabs]);

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
  }, []);

  const toggleTab = useCallback((tab: WorkspaceTabKey) => {
    setOpenTabs((tabs) => {
      if (tabs.includes(tab)) return tabs.filter((k) => k !== tab);
      if (tabs.length >= MAX_MODULAR_TABS) return tabs;
      return [...tabs, tab];
    });
  }, []);

  const reorderTab = useCallback((sourceIndex: number, targetIndex: number) => {
    setOpenTabs((tabs) => {
      if (tabs.length < 2) return tabs;
      if (sourceIndex < 0 || sourceIndex >= tabs.length) return tabs;
      const clamped = Math.max(0, Math.min(targetIndex, tabs.length));
      if (clamped === sourceIndex || clamped === sourceIndex + 1) return tabs;
      const next = [...tabs];
      const [item] = next.splice(sourceIndex, 1);
      next.splice(sourceIndex < clamped ? clamped - 1 : clamped, 0, item);
      return next;
    });
  }, []);

  return (
    <WorkspaceTabsContext.Provider
      value={{
        openTabs,
        setOpenTabs,
        tabsAvailableToAdd,
        canDragTabs,
        addTab,
        closeTab,
        toggleTab,
        reorderTab,
      }}
    >
      {children}
    </WorkspaceTabsContext.Provider>
  );
}

export function useWorkspaceTabs() {
  const ctx = useContext(WorkspaceTabsContext);
  if (!ctx) throw new Error('useWorkspaceTabs must be used inside WorkspaceTabsProvider');
  return ctx;
}

'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  MAX_MODULAR_TABS,
  WORKSPACE_TAB_ORDER,
  type WorkspaceTabKey,
} from '@/lib/config/tab-config';
import { getStoredWorkspaceTabs, setStoredWorkspaceTabs } from '@/lib/storage/workspace';

const DEFAULT_TABS: WorkspaceTabKey[] = ['reader'];

type WorkspaceTabsContextValue = {
  openTabs: WorkspaceTabKey[];
  addTab: (tab: WorkspaceTabKey) => boolean;
  closeTab: (tab: WorkspaceTabKey) => void;
  toggleTab: (tab: WorkspaceTabKey) => void;
};

const WorkspaceTabsContext = createContext<WorkspaceTabsContextValue | null>(null);

// Tabs are always rendered in canonical WORKSPACE_TAB_ORDER. No reorder UI.
function canonicalize(tabs: WorkspaceTabKey[]): WorkspaceTabKey[] {
  return WORKSPACE_TAB_ORDER.filter((key) => tabs.includes(key));
}

export function WorkspaceTabsProvider({ children }: { children: React.ReactNode }) {
  const [openTabs, setOpenTabs] = useState<WorkspaceTabKey[]>(DEFAULT_TABS);
  const persistReadyRef = useRef(false);

  // Hydrate from localStorage on mount
  useEffect(() => {
    const stored = getStoredWorkspaceTabs();
    if (stored) setOpenTabs(canonicalize(stored));
    persistReadyRef.current = true;
  }, []);

  // Persist
  useEffect(() => {
    if (!persistReadyRef.current) return;
    setStoredWorkspaceTabs(openTabs);
  }, [openTabs]);

  const addTab = useCallback((tab: WorkspaceTabKey): boolean => {
    let added = false;
    setOpenTabs((tabs) => {
      if (tabs.includes(tab) || tabs.length >= MAX_MODULAR_TABS) return tabs;
      added = true;
      return canonicalize([...tabs, tab]);
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
      return canonicalize([...tabs, tab]);
    });
  }, []);

  const value = useMemo(
    () => ({ openTabs, addTab, closeTab, toggleTab }),
    [openTabs, addTab, closeTab, toggleTab],
  );

  return (
    <WorkspaceTabsContext.Provider value={value}>
      {children}
    </WorkspaceTabsContext.Provider>
  );
}

export function useWorkspaceTabs() {
  const ctx = useContext(WorkspaceTabsContext);
  if (!ctx) throw new Error('useWorkspaceTabs must be used inside WorkspaceTabsProvider');
  return ctx;
}

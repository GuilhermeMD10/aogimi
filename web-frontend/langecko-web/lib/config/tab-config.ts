import type { LucideIcon } from 'lucide-react';
import { BookOpen, Search, Layers } from 'lucide-react';

export type WorkspaceTabKey = 'dictionary' | 'reader' | 'cards';

export const MAX_MODULAR_TABS = 3;

type WorkspaceTabMeta = {
  label: string;
  path: string;
  dot: string;
  icon: LucideIcon;
};

export const WORKSPACE_TAB_ORDER: WorkspaceTabKey[] = ['dictionary', 'reader', 'cards'];

export const WORKSPACE_TAB_META: Record<WorkspaceTabKey, WorkspaceTabMeta> = {
  reader: {
    label: 'Reader',
    path: '/modular',
    dot: '#D97757',
    icon: BookOpen,
  },
  dictionary: {
    label: 'Dictionary',
    path: '/dictionary',
    dot: '#4B7AA3',
    icon: Search,
  },
  cards: {
    label: 'Cards',
    path: '/cards',
    dot: '#8FB08A',
    icon: Layers,
  },
};

export function parseWorkspaceTab(value: string | null): WorkspaceTabKey | null {
  if (value === 'dictionary' || value === 'reader' || value === 'cards') {
    return value;
  }

  return null;
}

export function getCompanionTab(tab: WorkspaceTabKey): WorkspaceTabKey {
  return tab === 'dictionary' ? 'reader' : 'dictionary';
}

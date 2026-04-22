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

export const WORKSPACE_TAB_ORDER: WorkspaceTabKey[] = ['reader', 'dictionary', 'cards'];

export const WORKSPACE_TAB_META: Record<WorkspaceTabKey, WorkspaceTabMeta> = {
  reader: {
    label: 'Reader',
    path: '/workspace',
    dot: '#D97757',
    icon: BookOpen,
  },
  dictionary: {
    label: 'Dictionary',
    path: '/workspace',
    dot: '#4B7AA3',
    icon: Search,
  },
  cards: {
    label: 'Decks',
    path: '/workspace',
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

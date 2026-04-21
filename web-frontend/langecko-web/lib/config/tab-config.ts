import type { LucideIcon } from 'lucide-react';
import { BookOpen, Search, Layers, Library } from 'lucide-react';

export type WorkspaceTabKey = 'library' | 'dictionary' | 'reader' | 'cards';

export const MAX_MODULAR_TABS = 4;

type WorkspaceTabMeta = {
  label: string;
  path: string;
  dot: string;
  icon: LucideIcon;
};

export const WORKSPACE_TAB_ORDER: WorkspaceTabKey[] = ['library', 'dictionary', 'reader', 'cards'];

export const WORKSPACE_TAB_META: Record<WorkspaceTabKey, WorkspaceTabMeta> = {
  library: {
    label: 'Library',
    path: '/workspace',
    dot: '#B5A27C',
    icon: Library,
  },
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
  if (value === 'library' || value === 'dictionary' || value === 'reader' || value === 'cards') {
    return value;
  }

  return null;
}

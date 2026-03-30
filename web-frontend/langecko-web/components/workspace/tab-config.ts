export type WorkspaceTabKey = 'dictionary' | 'reader' | 'cards';

export const MAX_MODULAR_TABS = 3;

type WorkspaceTabMeta = {
  label: string;
  path: string;
};

export const WORKSPACE_TAB_ORDER: WorkspaceTabKey[] = ['dictionary', 'reader', 'cards'];

export const WORKSPACE_TAB_META: Record<WorkspaceTabKey, WorkspaceTabMeta> = {
  dictionary: {
    label: 'Dictionary',
    path: '/dictionary',
  },
  reader: {
    label: 'Reader',
    path: '/epub-pdf-reader',
  },
  cards: {
    label: 'Cards',
    path: '/cards',
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

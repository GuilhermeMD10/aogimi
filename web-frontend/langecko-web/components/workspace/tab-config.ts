export type WorkspaceTabKey = 'dictionary' | 'reader';

export const MAX_MODULAR_TABS = 2;

type WorkspaceTabMeta = {
  label: string;
  path: string;
};

export const WORKSPACE_TAB_ORDER: WorkspaceTabKey[] = ['dictionary', 'reader'];

export const WORKSPACE_TAB_META: Record<WorkspaceTabKey, WorkspaceTabMeta> = {
  dictionary: {
    label: 'Dictionary',
    path: '/dictionary',
  },
  reader: {
    label: 'Epub Pdf Reader',
    path: '/epub-pdf-reader',
  },
};

export function parseWorkspaceTab(value: string | null): WorkspaceTabKey | null {
  if (value === 'dictionary' || value === 'reader') {
    return value;
  }

  return null;
}

export function getCompanionTab(tab: WorkspaceTabKey): WorkspaceTabKey {
  return tab === 'dictionary' ? 'reader' : 'dictionary';
}

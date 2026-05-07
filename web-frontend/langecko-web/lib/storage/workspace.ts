import { parseWorkspaceTab, type WorkspaceTabKey } from '@/lib/config/tab-config';
import { getJSON, setJSON } from './_helpers';

const KEY = 'modular_layout';

export function getStoredWorkspaceTabs(): WorkspaceTabKey[] | null {
  const saved = getJSON<unknown>(KEY);
  if (!Array.isArray(saved)) return null;
  const valid = (saved as string[]).filter((k) => parseWorkspaceTab(k) !== null) as WorkspaceTabKey[];
  return valid.length > 0 ? valid : null;
}

export function setStoredWorkspaceTabs(tabs: WorkspaceTabKey[]): void {
  setJSON(KEY, tabs);
}

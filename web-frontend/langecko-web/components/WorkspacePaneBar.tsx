'use client';

import { X } from 'lucide-react';
import { WORKSPACE_TAB_META } from '@/lib/config/tab-config';
import { useWorkspaceTabs } from '@/components/providers/WorkspaceTabsProvider';

// Status-only display of currently-open panes. Adding a pane is done from the
// nav (single click on the icon — see WorkspaceNav). Removing a pane is the
// chip's close-X. Chip order is fixed by WORKSPACE_TAB_ORDER; there is no
// drag-reorder.

export default function WorkspacePaneBar() {
  const { openTabs, closeTab } = useWorkspaceTabs();

  if (openTabs.length === 0) return null;

  return (
    <div className="lgc-panebar" style={{ padding: '8px 12px' }}>
      <span
        className="select-none text-[10px] font-semibold uppercase tracking-widest text-lgc-fg-muted"
        style={{ marginRight: 4 }}
      >
        Panes
      </span>

      {openTabs.map((tabKey) => {
        const meta = WORKSPACE_TAB_META[tabKey];
        const Icon = meta.icon;
        return (
          <div key={tabKey} className="lgc-panechip">
            <span className="lgc-panechip-dot" style={{ background: meta.dot }} />
            <Icon size={12} className="text-lgc-fg-muted" />
            <span className="text-[12px] font-medium">{meta.label}</span>
            <button
              type="button"
              onClick={() => closeTab(tabKey)}
              className="ml-1 flex h-4 w-4 items-center justify-center rounded-full text-lgc-fg-subtle transition-colors hover:bg-lgc-bg-sunken hover:text-lgc-fg"
              aria-label={`Close ${meta.label}`}
            >
              <X size={9} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

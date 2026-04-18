'use client';

import { useRouter } from 'next/navigation';
import {
  getCompanionTab,
  WORKSPACE_TAB_META,
  type WorkspaceTabKey,
} from '@/lib/config/tab-config';

export default function SinglePageWorkspace({
  tab,
  children,
}: Readonly<{
  tab: WorkspaceTabKey;
  children: React.ReactNode;
}>) {
  const router = useRouter();
  const currentMeta = WORKSPACE_TAB_META[tab];
  const companionTab = getCompanionTab(tab);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-9 shrink-0 items-center border-b border-lgc-border px-3">
        <p className="text-xs font-medium text-lgc-fg">{currentMeta.label}</p>

        <button
          type="button"
          onClick={() => router.push(`/modular?left=${tab}&right=${companionTab}`)}
          className="ml-auto flex h-7 w-7 items-center justify-center rounded border border-lgc-border text-sm font-medium text-lgc-fg-muted transition-colors hover:bg-lgc-accent-soft hover:text-lgc-fg"
          aria-label={`Add ${WORKSPACE_TAB_META[companionTab].label} to split view`}
        >
          +
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">{children}</div>
    </div>
  );
}

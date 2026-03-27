'use client';

import { useRouter } from 'next/navigation';
import {
  getCompanionTab,
  WORKSPACE_TAB_META,
  type WorkspaceTabKey,
} from '@/components/workspace/tab-config';

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
      <div className="flex h-9 shrink-0 items-center border-b border-lumina-border-divider px-3">
        <p className="text-xs font-medium text-black">{currentMeta.label}</p>

        <button
          type="button"
          onClick={() => router.push(`/modular?left=${tab}&right=${companionTab}`)}
          className="ml-auto h-7 w-7 rounded border border-lumina-border-divider text-sm font-medium text-black hover:bg-black/5"
          aria-label={`Add ${WORKSPACE_TAB_META[companionTab].label} to split view`}
        >
          +
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">{children}</div>
    </div>
  );
}

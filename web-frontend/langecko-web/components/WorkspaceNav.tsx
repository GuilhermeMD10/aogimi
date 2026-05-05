'use client';

import { useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useWorkspaceTabs } from '@/components/providers/WorkspaceTabsProvider';
import { type WorkspaceTabKey } from '@/lib/config/tab-config';
import { createThemedComponent } from '@/components/theme-decorations/createThemedComponent';
import { DefaultWorkspaceNav } from '@/components/theme-decorations/default/WorkspaceNav';
import { StampWorkspaceNav } from '@/components/theme-decorations/stamp/WorkspaceNav';
import type {
  BubbleKey,
  WorkspaceNavVariantProps,
} from '@/components/WorkspaceNav.types';

export type { BubbleKey } from '@/components/WorkspaceNav.types';

// ── Theme dispatcher ────────────────────────────────────────────────────────
//
// Each theme variant lives in `components/theme-decorations/<theme>/WorkspaceNav.tsx`
// and is wired in here. To add a new theme variant: drop a file there and
// register it below.

const ThemedWorkspaceNav = createThemedComponent<WorkspaceNavVariantProps>(
  DefaultWorkspaceNav,
  {
    stamp: StampWorkspaceNav,
  },
  'WorkspaceNav',
);

// ── Top-level component ─────────────────────────────────────────────────────
//
// Owns the routing/state hooks and forwards their values into whichever
// variant the theme dispatcher resolves to.

type WorkspaceNavProps = {
  activeBubble: BubbleKey | null;
  onToggleBubble: (key: BubbleKey) => void;
};

export default function WorkspaceNav({ activeBubble, onToggleBubble }: WorkspaceNavProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { openTabs, toggleTab, addTab } = useWorkspaceTabs();

  const onTabClick = useCallback(
    (tab: WorkspaceTabKey) => {
      if (pathname !== '/workspace') {
        if (!openTabs.includes(tab)) addTab(tab);
        router.push('/workspace');
        return;
      }
      toggleTab(tab);
    },
    [pathname, openTabs, addTab, toggleTab, router],
  );

  const onHomeClick = useCallback(() => {
    router.push('/');
  }, [router]);

  return (
    <ThemedWorkspaceNav
      activeBubble={activeBubble}
      onToggleBubble={onToggleBubble}
      openTabs={openTabs}
      onTabClick={onTabClick}
      onHomeClick={onHomeClick}
      isHomeActive={pathname === '/'}
      pathname={pathname}
    />
  );
}

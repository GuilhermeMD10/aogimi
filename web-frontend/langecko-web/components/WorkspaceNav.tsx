'use client';

import { useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { createThemedComponent } from '@/components/theme-decorations/createThemedComponent';
import { DefaultWorkspaceNav } from '@/components/theme-decorations/default/WorkspaceNav';
import { StampWorkspaceNav } from '@/components/theme-decorations/stamp/WorkspaceNav';
import type {
  BubbleKey,
  WorkspaceNavVariantProps,
} from '@/components/WorkspaceNav.types';

export type { BubbleKey } from '@/components/WorkspaceNav.types';

// ── Theme dispatcher ────────────────────────────────────────────────────────

const ThemedWorkspaceNav = createThemedComponent<WorkspaceNavVariantProps>(
  DefaultWorkspaceNav,
  {
    stamp: StampWorkspaceNav,
  },
  'WorkspaceNav',
);

// ── Top-level component ─────────────────────────────────────────────────────
//
// Each nav button is a route push. Profile/settings remain bubble overlays.

type WorkspaceNavProps = {
  activeBubble: BubbleKey | null;
  onToggleBubble: (key: BubbleKey) => void;
};

export default function WorkspaceNav({ activeBubble, onToggleBubble }: WorkspaceNavProps) {
  const router = useRouter();
  const pathname = usePathname();

  const onNavClick = useCallback((path: string) => router.push(path), [router]);
  const onHomeClick = useCallback(() => router.push('/'), [router]);

  return (
    <ThemedWorkspaceNav
      activeBubble={activeBubble}
      onToggleBubble={onToggleBubble}
      onNavClick={onNavClick}
      onHomeClick={onHomeClick}
      isHomeActive={pathname === '/'}
      pathname={pathname}
    />
  );
}

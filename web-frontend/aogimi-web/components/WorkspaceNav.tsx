'use client';

import { useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useThemedComponent } from '@/themes/useThemedComponent';
import { DefaultWorkspaceNav } from './WorkspaceNav.default';
import type { BubbleKey } from './WorkspaceNav.types';

export type { BubbleKey } from './WorkspaceNav.types';

// ── Top-level component ─────────────────────────────────────────────────────
//
// Outer container handles router/pathname state. The visual shell is
// theme-dispatched — variants live at:
//   default · `./WorkspaceNav.default.tsx`
//   stamp   · `themes/stamp/components/WorkspaceNav.tsx`

type WorkspaceNavProps = {
  activeBubble: BubbleKey | null;
  onToggleBubble: (key: BubbleKey) => void;
};

export default function WorkspaceNav({ activeBubble, onToggleBubble }: WorkspaceNavProps) {
  const router = useRouter();
  const pathname = usePathname();

  const onNavClick = useCallback((path: string) => router.push(path), [router]);
  const onHomeClick = useCallback(() => router.push('/'), [router]);

  const Resolved = useThemedComponent('WorkspaceNav', DefaultWorkspaceNav);

  return (
    <Resolved
      activeBubble={activeBubble}
      onToggleBubble={onToggleBubble}
      onNavClick={onNavClick}
      onHomeClick={onHomeClick}
      isHomeActive={pathname === '/'}
      pathname={pathname}
    />
  );
}

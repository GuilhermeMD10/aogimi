import type { IconName } from '@/components/icons';
import type { WorkspaceTabKey } from '@/lib/config/tab-config';

// ── Items shared by every theme variant ─────────────────────────────────────

export type BubbleKey = 'profile' | 'settings';

export const WORKSPACE_ITEMS: { key: WorkspaceTabKey; icon: IconName }[] = [
  { key: 'reader', icon: 'reader' },
  { key: 'dictionary', icon: 'dictionary' },
  { key: 'cards', icon: 'cards' },
];

export const BUBBLE_ITEMS: { key: BubbleKey; icon: IconName; label: string }[] = [
  { key: 'profile', icon: 'profile', label: 'Profile' },
  { key: 'settings', icon: 'settings', label: 'Settings' },
];

/**
 * Props every WorkspaceNav variant accepts. The dispatcher in
 * `components/WorkspaceNav.tsx` owns the routing/state hooks and forwards
 * these computed values into whichever variant the active theme picks.
 */
export type WorkspaceNavVariantProps = {
  activeBubble: BubbleKey | null;
  onToggleBubble: (key: BubbleKey) => void;
  openTabs: WorkspaceTabKey[];
  onTabClick: (tab: WorkspaceTabKey) => void;
  onHomeClick: () => void;
  isHomeActive: boolean;
  pathname: string;
};

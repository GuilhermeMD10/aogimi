import type { IconName } from '@/components/icons';

// ── Items shared by every theme variant ─────────────────────────────────────

export type BubbleKey = 'profile' | 'settings';

export type NavRouteKey = 'reader' | 'dictionary' | 'cards' | 'workspace';

export const NAV_ITEMS: { key: NavRouteKey; icon: IconName; label: string; path: string }[] = [
  { key: 'reader',     icon: 'reader',     label: 'Reader',     path: '/reader' },
  { key: 'dictionary', icon: 'dictionary', label: 'Dictionary', path: '/dictionary' },
  { key: 'cards',      icon: 'cards',      label: 'Decks',      path: '/decks' },
  { key: 'workspace',  icon: 'workspace',  label: 'Workspace',  path: '/workspace' },
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
  onNavClick: (path: string) => void;
  onHomeClick: () => void;
  isHomeActive: boolean;
  pathname: string;
};

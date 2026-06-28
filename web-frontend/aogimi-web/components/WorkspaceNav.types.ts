import type { IconName } from '@/shared/icons';

// ── Nav items ───────────────────────────────────────────────────────────────

export type BubbleKey = 'profile' | 'settings';

export type NavRouteKey = 'reader' | 'dictionary' | 'cards';

export const NAV_ITEMS: { key: NavRouteKey; icon: IconName; label: string; path: string }[] = [
  { key: 'reader',     icon: 'reader',     label: 'Reader',     path: '/reader' },
  { key: 'dictionary', icon: 'dictionary', label: 'Dictionary', path: '/dictionary' },
  { key: 'cards',      icon: 'cards',      label: 'Decks',      path: '/decks' },
];

export const BUBBLE_ITEMS: { key: BubbleKey; icon: IconName; label: string }[] = [
  { key: 'profile', icon: 'profile', label: 'Profile' },
  { key: 'settings', icon: 'settings', label: 'Settings' },
];

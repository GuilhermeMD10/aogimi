import type { IconName } from '@/shared/icons';

// ── Nav items ───────────────────────────────────────────────────────────────

export type NavRouteKey = 'reader' | 'dictionary' | 'cards' | 'profile' | 'settings';

type NavItem = { key: NavRouteKey; icon: IconName; label: string; path: string };

// Primary group (left of the home button).
export const NAV_ITEMS: NavItem[] = [
  { key: 'reader',     icon: 'reader',     label: 'Reader',     path: '/reader' },
  { key: 'dictionary', icon: 'dictionary', label: 'Dictionary', path: '/dictionary' },
  { key: 'cards',      icon: 'cards',      label: 'Decks',      path: '/decks' },
];

// Secondary group (right of the home button). Formerly bubble overlays,
// now plain routes.
export const SECONDARY_NAV_ITEMS: NavItem[] = [
  { key: 'profile',  icon: 'profile',  label: 'Profile',  path: '/profile' },
  { key: 'settings', icon: 'settings', label: 'Settings', path: '/settings' },
];

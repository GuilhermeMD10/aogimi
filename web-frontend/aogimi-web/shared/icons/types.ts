import type { LucideProps } from 'lucide-react';
import type { ComponentType } from 'react';

/**
 * Stable icon identifiers used across the app.
 *
 * To add a new icon name:
 *   1. add it to this union
 *   2. add the mapping in `./default.tsx`
 */
export type IconName =
  // Navigation / sections
  | 'home'
  | 'reader'
  | 'dictionary'
  | 'cards'
  | 'profile'
  | 'settings'
  | 'search'
  // Actions
  | 'add'
  | 'check'
  | 'plus'
  | 'minus'
  | 'x'
  | 'trash'
  | 'arrowLeft'
  // Reader / study
  | 'mark'
  | 'note'
  | 'volume'
  | 'star'
  | 'languages';

export type IconProps = LucideProps;

export type IconComponent = ComponentType<IconProps>;

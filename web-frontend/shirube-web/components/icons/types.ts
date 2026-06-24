import type { LucideProps } from 'lucide-react';
import type { ComponentType } from 'react';

/**
 * Stable, theme-agnostic icon identifiers used across the app.
 *
 * To add a new icon name:
 *   1. add it to this union
 *   2. add the default mapping in `./default.tsx`
 *   3. (optional) override per theme in e.g. `./stamp.tsx`
 *
 * Names that aren't overridden by a theme fall through to the default.
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
  | 'languages'
  // Decorative / brand
  | 'mail'
  | 'stamp'
  | 'lantern'
  | 'mountain'
  | 'sun'
  | 'crest';

export type IconProps = LucideProps;

export type IconComponent = ComponentType<IconProps>;

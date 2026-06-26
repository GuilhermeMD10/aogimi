/**
 * Icon set — lucide-react icons mapped to canonical IconNames.
 */

import {
  ArrowLeft,
  BookOpen,
  Bookmark,
  Check,
  Home,
  Languages,
  Layers,
  Minus,
  PenSquare,
  Plus,
  Search,
  Settings,
  Star,
  Trash2,
  User,
  Volume2,
  X,
} from 'lucide-react';

import type { IconComponent, IconName } from './types';

export const defaultIcons: Record<IconName, IconComponent> = {
  // Navigation / sections
  home: Home,
  reader: BookOpen,
  dictionary: Search,
  cards: Layers,
  profile: User,
  settings: Settings,
  search: Search,
  // Actions
  add: Plus,
  check: Check,
  plus: Plus,
  minus: Minus,
  x: X,
  trash: Trash2,
  arrowLeft: ArrowLeft,
  // Reader / study
  mark: Bookmark,
  note: PenSquare,
  volume: Volume2,
  star: Star,
  languages: Languages,
};

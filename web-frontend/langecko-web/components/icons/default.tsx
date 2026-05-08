/**
 * Default icon set — lucide-react icons mapped to canonical IconNames.
 * This is the fallback that every theme inherits from when it doesn't
 * provide its own override.
 */

import {
  ArrowLeft,
  BookOpen,
  Bookmark,
  Check,
  Columns2,
  Flower,
  Home,
  Languages,
  Layers,
  Lightbulb,
  Mail,
  Minus,
  Mountain,
  PenSquare,
  Plus,
  Search,
  Settings,
  Stamp,
  Star,
  Sun,
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
  workspace: Columns2,
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
  // Decorative / brand
  mail: Mail,
  stamp: Stamp,
  lantern: Lightbulb,
  mountain: Mountain,
  sun: Sun,
  crest: Flower,
};

'use client';

import * as React from 'react';

import type { AppTheme } from '@/components/providers/ThemeProvider';
import { useTheme } from '@/components/providers/ThemeProvider';

import { defaultIcons } from './default';
import { stampIcons } from './stamp';
import type { IconComponent, IconName, IconProps } from './types';

/**
 * Per-theme icon overrides. Only themes that ship custom artwork need an
 * entry. Anything not in `ICON_SETS[theme]` falls back to `defaultIcons`.
 *
 * Add a new theme:
 *   1. drop a file alongside default.tsx / stamp.tsx exporting a partial map
 *   2. import + register it here
 */
const ICON_SETS: Partial<Record<AppTheme, Partial<Record<IconName, IconComponent>>>> = {
  stamp: stampIcons,
};

type Props = { name: IconName } & IconProps;

/**
 * Theme-aware icon. Renders the per-theme override if one exists,
 * otherwise falls through to the default (lucide-react) icon.
 *
 *   <Icon name="reader" size={16} />
 */
export function Icon({ name, ...props }: Props) {
  const { theme } = useTheme();
  const themed = ICON_SETS[theme]?.[name];
  const Cmp = themed ?? defaultIcons[name];
  return <Cmp {...props} />;
}

export type { IconName, IconProps, IconComponent } from './types';

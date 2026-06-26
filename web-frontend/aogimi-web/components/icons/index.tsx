'use client';

import * as React from 'react';

import { defaultIcons } from './default';
import type { IconName, IconProps } from './types';

type Props = { name: IconName } & IconProps;

/**
 * Icon renderer (lucide-react under the hood).
 *
 *   <Icon name="reader" size={16} />
 */
export function Icon({ name, ...props }: Props) {
  const Cmp = defaultIcons[name];
  return <Cmp {...props} />;
}

export type { IconName, IconProps, IconComponent } from './types';

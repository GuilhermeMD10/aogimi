'use client';

import { forwardRef } from 'react';
import { useThemedComponent } from '@/themes/useThemedComponent';
import { TextContextMenu as DefaultTextContextMenu, type TextContextMenuProps } from './TextContextMenu';

export type { TextContextMenuProps } from './TextContextMenu';

export const TextContextMenu = forwardRef<HTMLDivElement, TextContextMenuProps>(
  function TextContextMenu(props, ref) {
    const Resolved = useThemedComponent('TextContextMenu', DefaultTextContextMenu);
    return <Resolved ref={ref} {...props} />;
  },
);

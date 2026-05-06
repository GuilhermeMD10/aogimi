'use client';

import { forwardRef, useMemo } from 'react';
import { useTheme } from '@/components/providers/ThemeProvider';
import { themeComponentRegistry } from '@/themes';
import { TextContextMenu as DefaultTextContextMenu, type TextContextMenuProps } from './TextContextMenu';

export type { TextContextMenuProps } from './TextContextMenu';

export const TextContextMenu = forwardRef<HTMLDivElement, TextContextMenuProps>(
  function TextContextMenu(props, ref) {
    const { theme } = useTheme();
    const Resolved = useMemo(
      () => themeComponentRegistry[theme]?.TextContextMenu ?? DefaultTextContextMenu,
      [theme],
    );
    return <Resolved ref={ref} {...props} />;
  },
);

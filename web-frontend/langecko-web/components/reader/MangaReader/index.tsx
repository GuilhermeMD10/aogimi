'use client';

import { useMemo } from 'react';
import { useTheme } from '@/components/providers/ThemeProvider';
import { themeComponentRegistry } from '@/themes';
import { MangaReader as DefaultMangaReader, type MangaReaderProps } from './MangaReader';

export type { MangaReaderProps } from './MangaReader';

export function MangaReader(props: MangaReaderProps) {
  const { theme } = useTheme();
  const Resolved = useMemo(
    () => themeComponentRegistry[theme]?.MangaReader ?? DefaultMangaReader,
    [theme],
  );
  return <Resolved {...props} />;
}

'use client';

import { useThemedComponent } from '@/themes/useThemedComponent';
import { MangaReader as DefaultMangaReader, type MangaReaderProps } from './MangaReader';

export type { MangaReaderProps } from './MangaReader';

export function MangaReader(props: MangaReaderProps) {
  const Resolved = useThemedComponent('MangaReader', DefaultMangaReader);
  return <Resolved {...props} />;
}

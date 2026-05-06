'use client';

import { useMemo } from 'react';
import { useTheme } from '@/components/providers/ThemeProvider';
import { themeComponentRegistry } from '@/themes';
import DefaultDictionaryView, { type DictionaryViewProps } from './DictionaryView';

export type { DictionaryViewProps } from './DictionaryView';
export { JlptChip } from './DictionaryView';

export default function DictionaryView(props: DictionaryViewProps) {
  const { theme } = useTheme();
  const Resolved = useMemo(
    () => themeComponentRegistry[theme]?.DictionaryView ?? DefaultDictionaryView,
    [theme],
  );
  return <Resolved {...props} />;
}

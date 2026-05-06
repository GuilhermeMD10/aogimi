'use client';

import { useMemo } from 'react';
import { useTheme } from '@/components/providers/ThemeProvider';
import { themeComponentRegistry } from '@/themes';
import { TextReader as DefaultTextReader, type TextReaderProps } from './TextReader';

export type { TextReaderProps } from './TextReader';

export function TextReader(props: TextReaderProps) {
  const { theme } = useTheme();
  const Resolved = useMemo(
    () => themeComponentRegistry[theme]?.TextReader ?? DefaultTextReader,
    [theme],
  );
  return <Resolved {...props} />;
}

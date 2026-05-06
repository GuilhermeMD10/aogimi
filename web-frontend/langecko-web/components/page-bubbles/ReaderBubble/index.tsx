'use client';

import { useMemo } from 'react';
import { useTheme } from '@/components/providers/ThemeProvider';
import { themeComponentRegistry } from '@/themes';
import DefaultReaderBubble, { type ReaderBubbleProps } from './ReaderBubble';

export type { ReaderBubbleProps } from './ReaderBubble';

export default function ReaderBubble(props: ReaderBubbleProps) {
  const { theme } = useTheme();
  const Resolved = useMemo(
    () => themeComponentRegistry[theme]?.ReaderBubble ?? DefaultReaderBubble,
    [theme],
  );
  return <Resolved {...props} />;
}

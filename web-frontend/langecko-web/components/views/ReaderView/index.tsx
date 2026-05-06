'use client';

import { useMemo } from 'react';
import { useTheme } from '@/components/providers/ThemeProvider';
import { themeComponentRegistry } from '@/themes';
import DefaultReaderView from './ReaderView';

export default function ReaderView() {
  const { theme } = useTheme();
  const Resolved = useMemo(
    () => themeComponentRegistry[theme]?.ReaderView ?? DefaultReaderView,
    [theme],
  );
  return <Resolved />;
}

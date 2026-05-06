'use client';

import { useMemo } from 'react';
import { useTheme } from '@/components/providers/ThemeProvider';
import { themeComponentRegistry } from '@/themes';
import DefaultHomeView from './HomeView';

export default function HomeView() {
  const { theme } = useTheme();
  const Resolved = useMemo(
    () => themeComponentRegistry[theme]?.HomeView ?? DefaultHomeView,
    [theme],
  );
  return <Resolved />;
}

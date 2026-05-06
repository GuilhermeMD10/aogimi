'use client';

import { useMemo } from 'react';
import { useTheme } from '@/components/providers/ThemeProvider';
import { themeComponentRegistry } from '@/themes';
import { StudyView as DefaultStudyView, type StudyViewProps } from './StudyView';

export type { StudyViewProps } from './StudyView';

export function StudyView(props: StudyViewProps) {
  const { theme } = useTheme();
  const Resolved = useMemo(
    () => themeComponentRegistry[theme]?.StudyView ?? DefaultStudyView,
    [theme],
  );
  return <Resolved {...props} />;
}

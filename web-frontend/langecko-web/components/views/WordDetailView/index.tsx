'use client';

import { useMemo } from 'react';
import { useTheme } from '@/components/providers/ThemeProvider';
import { themeComponentRegistry } from '@/themes';
import DefaultWordDetailView from './WordDetailView';

export { preferredHeadword } from './WordDetailView';

type Props = React.ComponentProps<typeof DefaultWordDetailView>;

export default function WordDetailView(props: Props) {
  const { theme } = useTheme();
  const Resolved = useMemo(
    () => themeComponentRegistry[theme]?.WordDetailView ?? DefaultWordDetailView,
    [theme],
  );
  return <Resolved {...props} />;
}

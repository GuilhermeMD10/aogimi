'use client';

import { useMemo } from 'react';
import { useTheme } from '@/components/providers/ThemeProvider';
import { themeComponentRegistry } from '@/themes';
import DefaultProfileBubble, { type ProfileBubbleProps } from './ProfileBubble';

export type { ProfileBubbleProps } from './ProfileBubble';

export default function ProfileBubble(props: ProfileBubbleProps) {
  const { theme } = useTheme();
  const Resolved = useMemo(
    () => themeComponentRegistry[theme]?.ProfileBubble ?? DefaultProfileBubble,
    [theme],
  );
  return <Resolved {...props} />;
}

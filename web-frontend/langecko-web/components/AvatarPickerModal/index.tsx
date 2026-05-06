'use client';

import { useMemo } from 'react';
import { useTheme } from '@/components/providers/ThemeProvider';
import { themeComponentRegistry } from '@/themes';
import DefaultAvatarPickerModal, { type AvatarPickerModalProps } from './AvatarPickerModal';

export type { AvatarPickerModalProps } from './AvatarPickerModal';
export { KAMON_SET, Kamon } from './avatar';

export default function AvatarPickerModal(props: AvatarPickerModalProps) {
  const { theme } = useTheme();
  const Resolved = useMemo(
    () => themeComponentRegistry[theme]?.AvatarPickerModal ?? DefaultAvatarPickerModal,
    [theme],
  );
  return <Resolved {...props} />;
}

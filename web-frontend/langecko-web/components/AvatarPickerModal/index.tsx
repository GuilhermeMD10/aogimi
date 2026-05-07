'use client';

import { useThemedComponent } from '@/themes/useThemedComponent';
import DefaultAvatarPickerModal, { type AvatarPickerModalProps } from './AvatarPickerModal';

export type { AvatarPickerModalProps } from './AvatarPickerModal';
export { KAMON_SET, Kamon } from './avatar';

export default function AvatarPickerModal(props: AvatarPickerModalProps) {
  const Resolved = useThemedComponent('AvatarPickerModal', DefaultAvatarPickerModal);
  return <Resolved {...props} />;
}

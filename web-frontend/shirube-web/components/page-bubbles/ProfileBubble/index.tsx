'use client';

import { useThemedComponent } from '@/themes/useThemedComponent';
import DefaultProfileBubble, { type ProfileBubbleProps } from './ProfileBubble';

export type { ProfileBubbleProps } from './ProfileBubble';

export default function ProfileBubble(props: ProfileBubbleProps) {
  const Resolved = useThemedComponent('ProfileBubble', DefaultProfileBubble);
  return <Resolved {...props} />;
}

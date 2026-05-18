'use client';

import { useThemedComponent } from '@/themes/useThemedComponent';
import DefaultReaderBubble, { type ReaderBubbleProps } from './ReaderBubble';

export type { ReaderBubbleProps } from './ReaderBubble';

export default function ReaderBubble(props: ReaderBubbleProps) {
  const Resolved = useThemedComponent('ReaderBubble', DefaultReaderBubble);
  return <Resolved {...props} />;
}

'use client';

import { useThemedComponent } from '@/themes/useThemedComponent';
import { TextReader as DefaultTextReader, type TextReaderProps } from './TextReader';

export type { TextReaderProps } from './TextReader';

export function TextReader(props: TextReaderProps) {
  const Resolved = useThemedComponent('TextReader', DefaultTextReader);
  return <Resolved {...props} />;
}

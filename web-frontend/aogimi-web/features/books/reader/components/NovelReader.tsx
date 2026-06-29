'use client';

import { TextReader, type TextReaderProps } from '@/features/books/reader/components/TextReader';

type Props = Omit<TextReaderProps, 'rtl'>;

/**
 * Japanese novel reader — vertical-rl / RTL text EPUBs.
 * Thin wrapper around TextReader with RTL progress bar direction.
 */
export function NovelReader(props: Props) {
  return <TextReader {...props} rtl />;
}

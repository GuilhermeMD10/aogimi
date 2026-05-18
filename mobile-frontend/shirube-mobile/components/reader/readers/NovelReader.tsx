import { TextReader, type TextReaderProps } from './TextReader';

type Props = Omit<TextReaderProps, 'rtl'>;

/**
 * Japanese novel reader — vertical-rl, RTL pagination.
 * Thin wrapper around TextReader. The WebView's writing-mode is set by
 * ReaderScreen via the `vertical` flag on the style, so here we only flip
 * the toolbar's prev/next mapping.
 */
export function NovelReader(props: Props) {
  return <TextReader {...props} rtl />;
}

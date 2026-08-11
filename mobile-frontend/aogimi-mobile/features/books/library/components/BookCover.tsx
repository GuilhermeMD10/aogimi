import { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { coverGlyphFor } from '@/lib/coverGlyph';
import { useBookCover } from '../../lib/epubCover';
import { fontFamily, radius } from '@/theme/tokens';

type Props = {
  title: string;
  coverColor: string;
  /** When provided, attempts to extract & display the EPUB's embedded cover image. */
  filename?: string;
  width?: number;
  height?: number;
  aspectRatio?: number;
  style?: ViewStyle;
  cornerRadius?: number;
};

export function BookCover({
  title,
  coverColor,
  filename,
  width,
  height,
  aspectRatio,
  style,
  cornerRadius = radius.md,
}: Props) {
  // EPUB: read the embedded cover out of the OPF. PDF: render page 1 to a
  // JPEG via react-native-pdf-thumbnail. Both write once into covers/ and
  // the hook re-checks disk on every effect run, so a deleted file
  // automatically triggers re-extraction via `retry`.
  const { uri: coverUri, retry } = useBookCover(filename);
  const glyph = coverGlyphFor(title);

  // Once the cover image loads we learn its real width:height and size
  // the shell to match, so the container hugs the artwork instead of
  // pillarboxing a narrow cover inside a fixed-ratio box. Falls back to
  // the caller-supplied `aspectRatio` until the image loads (and for
  // the glyph placeholder when there's no cover). Reset on filename
  // change so a new book doesn't inherit the previous cover's ratio.
  const [naturalAspect, setNaturalAspect] = useState<number | null>(null);
  useEffect(() => {
    setNaturalAspect(null);
  }, [filename]);

  const effectiveAspect = naturalAspect ?? aspectRatio;
  const dims: ViewStyle = {};
  if (width !== undefined) dims.width = width;
  if (height !== undefined) dims.height = height;
  if (effectiveAspect !== undefined) dims.aspectRatio = effectiveAspect;

  return (
    <View
      style={[
        styles.wrap,
        dims,
        { borderRadius: cornerRadius, backgroundColor: coverColor },
        style,
      ]}
    >
      {coverUri ? (
        <Image
          source={{ uri: coverUri }}
          style={StyleSheet.absoluteFill}
          resizeMode="contain"
          onLoad={(e) => {
            const { width: w, height: h } = e.nativeEvent.source;
            if (w > 0 && h > 0) setNaturalAspect(w / h);
          }}
          // File was deleted out from under us, or extraction wrote a
          // path that's no longer readable. Ask the hook to re-check
          // disk + re-extract. If extraction fails (no book file, no
          // embedded cover), the hook returns null and the glyph
          // renders.
          onError={() => {
            setNaturalAspect(null);
            retry();
          }}
        />
      ) : (
        <Text
          style={[styles.glyph, { fontSize: (width ?? 64) * 0.6 }]}
          numberOfLines={1}
        >
          {glyph}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    overflow: 'hidden',
    justifyContent: 'flex-end',
    padding: 8,
  },
  glyph: {
    color: '#ffffff',
    fontFamily: fontFamily.jp,
    lineHeight: undefined,
  },
});

import { Image, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { coverGlyphFor } from '@/lib/coverGlyph';
import { useBookCover } from '../utils/epubCover';
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
  const darker = darken(coverColor, 0.55);

  const dims: ViewStyle = {};
  if (width !== undefined) dims.width = width;
  if (height !== undefined) dims.height = height;
  if (aspectRatio !== undefined) dims.aspectRatio = aspectRatio;

  return (
    <View style={[styles.wrap, dims, { borderRadius: cornerRadius }, style]}>
      <LinearGradient
        colors={[coverColor, darker]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {coverUri ? (
        <Image
          source={{ uri: coverUri }}
          style={StyleSheet.absoluteFill}
          resizeMode="contain"
          // File was deleted out from under us, or extraction wrote a
          // path that's no longer readable. Ask the hook to re-check
          // disk + re-extract. If extraction fails (no book file, no
          // embedded cover), the hook returns null and the glyph
          // renders.
          onError={retry}
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
    color: 'rgba(255,255,255,0.92)',
    fontFamily: fontFamily.jp,
    lineHeight: undefined,
  },
});

// ── helpers ──────────────────────────────────────────────────────────────────

function darken(hex: string, amount: number): string {
  const { r, g, b } = parseHex(hex);
  const f = Math.max(0, Math.min(1, amount));
  return rgbToHex(Math.round(r * f), Math.round(g * f), Math.round(b * f));
}

function parseHex(hex: string): { r: number; g: number; b: number } {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h, 16);
  if (Number.isNaN(n)) return { r: 74, g: 64, b: 56 }; // fallback warm gray
  return { r: (n >> 16) & 0xff, g: (n >> 8) & 0xff, b: n & 0xff };
}

function rgbToHex(r: number, g: number, b: number): string {
  const h = (n: number) => n.toString(16).padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}`;
}

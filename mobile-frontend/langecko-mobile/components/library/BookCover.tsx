import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { coverGlyphFor } from '@/lib/coverGlyph';
import { fontFamily, radius } from '@/theme/tokens';

type Props = {
  title: string;
  coverColor: string;
  width?: number;
  height?: number;
  aspectRatio?: number;
  style?: ViewStyle;
  cornerRadius?: number;
};

export function BookCover({
  title,
  coverColor,
  width,
  height,
  aspectRatio,
  style,
  cornerRadius = radius.md,
}: Props) {
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
      <Text
        style={[styles.glyph, { fontSize: (width ?? 64) * 0.6 }]}
        numberOfLines={1}
      >
        {glyph}
      </Text>
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

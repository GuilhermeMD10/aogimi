import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { fontFamily } from '@/theme/tokens';
import { deckColorFor, deckGlyphFor } from '@/lib/deckVisuals';

type Props = {
  deckKey: string;
  deckName: string;
  width?: number;
  height?: number;
  aspectRatio?: number;
  cornerRadius?: number;
  glyphSize?: number;
  style?: ViewStyle;
};

export function DeckCover({
  deckKey,
  deckName,
  width,
  height,
  aspectRatio,
  cornerRadius = 14,
  glyphSize,
  style,
}: Props) {
  const color = deckColorFor(deckKey);
  const glyph = deckGlyphFor(deckName);

  const dims: ViewStyle = {};
  if (width !== undefined) dims.width = width;
  if (height !== undefined) dims.height = height;
  if (aspectRatio !== undefined) dims.aspectRatio = aspectRatio;

  return (
    <View style={[styles.wrap, dims, { borderRadius: cornerRadius }, style]}>
      <LinearGradient
        colors={[color, darken(color, 0.45)]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <Text
        style={[
          styles.glyph,
          { fontSize: glyphSize ?? Math.round((height ?? 92) * 0.45) },
        ]}
        numberOfLines={1}
      >
        {glyph}
      </Text>
    </View>
  );
}

function darken(hex: string, amount: number): string {
  const { r, g, b } = parseHex(hex);
  const f = Math.max(0, Math.min(1, amount));
  const out = (n: number) => Math.round(n * f).toString(16).padStart(2, '0');
  return `#${out(r)}${out(g)}${out(b)}`;
}

function parseHex(hex: string): { r: number; g: number; b: number } {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h, 16);
  if (Number.isNaN(n)) return { r: 74, g: 64, b: 56 };
  return { r: (n >> 16) & 0xff, g: (n >> 8) & 0xff, b: n & 0xff };
}

const styles = StyleSheet.create({
  wrap: { overflow: 'hidden', justifyContent: 'flex-end', padding: 12 },
  glyph: {
    color: 'rgba(255,255,255,0.92)',
    fontFamily: fontFamily.jp,
    lineHeight: undefined,
  },
});

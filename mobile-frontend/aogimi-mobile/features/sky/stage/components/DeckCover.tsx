import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { fontFamily, palette } from '@/theme/tokens';
import { deckColorFor, deckGlyphFor } from '../lib/deckVisuals';

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

/**
 * A deck's cover: one flat colour from `deckColorFor` plus its glyph.
 *
 * **Strip-to-basics 2026-08-10.** This used to paint a corner-to-corner
 * `LinearGradient` from the deck colour to a 45%-darkened copy of it; the local
 * `darken`/`parseHex` helpers existed only to compute that second stop and went
 * with it. Flat fill now — one colour per deck, which is also what makes the
 * eight reset deck hues actually distinguishable from each other.
 */
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
    <View
      style={[styles.wrap, dims, { borderRadius: cornerRadius, backgroundColor: color }, style]}
    >
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

const styles = StyleSheet.create({
  wrap: { overflow: 'hidden', justifyContent: 'flex-end', padding: 12 },
  glyph: {
    // A cover glyph is text, so it follows the reset's one rule. `deckColorFor`
    // returns pale tints precisely so this can be black.
    color: palette.ink,
    fontFamily: fontFamily.jp,
    lineHeight: undefined,
  },
});

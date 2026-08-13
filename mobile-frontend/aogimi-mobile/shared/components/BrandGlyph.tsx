import { StyleSheet, Text, View } from 'react-native';
import { usePalette, useTheme } from '@/theme/ThemeContext';
import { fontFamily, radius } from '@/theme/tokens';

/**
 * The brand mark: 仰 on the accent tile.
 *
 * Reads the palette rather than `useColors()` — this is the one site whose ink
 * sits on the *accent* rather than on a filled surface, so the legacy
 * `accentFg` bridge (which resolves to `btnInk`) would put the wrong ink on the
 * tile. `accentInk` is the pair that goes with `accent`, whatever hue the
 * accent ends up being.
 *
 * `usePalette()`, not the static export: the accent is the one brand colour
 * that differs between the columns (vermillion in Day, lifted for Night), so a
 * static read would leave the mark Day-coloured on a Night page.
 */
export function BrandGlyph({ size = 64 }: { size?: number }) {
  const { theme } = useTheme();
  const p = usePalette();
  const fontSize = Math.round(size * 0.5);
  return (
    <View
      style={[
        styles.box,
        {
          width: size,
          height: size,
          borderRadius: radius.lg,
          backgroundColor: p.accent,
        },
      ]}
    >
      <Text
        style={{
          color: p.accentInk,
          fontFamily: fontFamily.jp,
          fontSize,
          fontWeight: '500',
        }}
      >
        {theme.meta.glyph}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { alignItems: 'center', justifyContent: 'center' },
});

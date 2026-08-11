import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import { fontFamily, palette, radius } from '@/theme/tokens';

/**
 * The brand mark: 仰 on the accent tile.
 *
 * Reads `palette` directly rather than `useColors()` — this is the one site
 * whose ink sits on the *accent* rather than on a pale filled surface, so the
 * legacy `accentFg` bridge (which resolves to `btnInk`) would put dark ink on a
 * dark tile. `accentInk` is the pair that goes with `accent`, whatever hue the
 * accent ends up being.
 */
export function BrandGlyph({ size = 64 }: { size?: number }) {
  const { theme } = useTheme();
  const fontSize = Math.round(size * 0.5);
  return (
    <View
      style={[
        styles.box,
        {
          width: size,
          height: size,
          borderRadius: radius.lg,
          backgroundColor: palette.accent,
        },
      ]}
    >
      <Text
        style={{
          color: palette.accentInk,
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

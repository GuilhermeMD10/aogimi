import { StyleSheet, Text, View } from 'react-native';
import { useColors, useTheme } from '@/theme/ThemeContext';
import { fontFamily, radius } from '@/theme/tokens';

export function BrandGlyph({ size = 64 }: { size?: number }) {
  const c = useColors();
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
          backgroundColor: c.accent,
        },
      ]}
    >
      <Text style={{ color: c.accentFg, fontFamily: fontFamily.jp, fontSize, fontWeight: '500' }}>
        {theme.meta.glyph}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { alignItems: 'center', justifyContent: 'center' },
});

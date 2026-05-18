import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/theme/ThemeContext';
import { listThemes, type ThemeName, fontFamily, fontSize, radius } from '@/theme/tokens';

export function ThemePicker() {
  const { themeName, setThemeName, colors } = useTheme();
  const themes = listThemes();

  return (
    <View style={styles.row}>
      {themes.map((th) => {
        const active = themeName === th.meta.name;
        return (
          <Pressable
            key={th.meta.name}
            onPress={() => setThemeName(th.meta.name as ThemeName)}
            style={[
              styles.card,
              {
                borderColor: active ? colors.accent : colors.border,
                borderWidth: active ? 2 : StyleSheet.hairlineWidth,
                backgroundColor: colors.bgElev,
              },
            ]}
          >
            <LinearGradient
              colors={[th.colors.bg, th.colors.bgSunken]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.swatch}
            >
              <View style={[styles.accentDot, { backgroundColor: th.colors.accent }]} />
              <Text style={[styles.glyph, { color: th.colors.fg }]}>{th.meta.glyph}</Text>
            </LinearGradient>
            <Text
              style={[styles.label, { color: active ? colors.fg : colors.fgMuted }]}
              numberOfLines={1}
            >
              {th.meta.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 10 },
  card: {
    flex: 1,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  swatch: {
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  glyph: { fontFamily: fontFamily.jp, fontSize: 28, fontWeight: '500' },
  accentDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  label: {
    fontSize: fontSize.xs,
    fontWeight: '500',
    textAlign: 'center',
    paddingVertical: 6,
  },
});

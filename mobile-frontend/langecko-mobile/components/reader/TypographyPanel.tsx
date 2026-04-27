import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { useColors } from '@/theme/ThemeContext';
import { fontFamily, fontSize, spacing } from '@/theme/tokens';
import {
  READER_THEMES,
  type ReaderFont,
  type ReaderPrefs,
  type ReaderTheme,
} from '@/lib/readerStorage';

type Props = {
  visible: boolean;
  prefs: ReaderPrefs;
  onChange: (patch: Partial<ReaderPrefs>) => void;
  onDismiss: () => void;
};

const FONTS: { key: ReaderFont; label: string; jp: string }[] = [
  { key: 'serif-jp', label: '明朝', jp: 'Mincho' },
  { key: 'sans-jp', label: 'ゴシック', jp: 'Gothic' },
  { key: 'system', label: 'A', jp: 'System' },
];

const LINE_HEIGHTS = [1.2, 1.5, 1.7, 2.0, 2.3];

const THEMES: { key: ReaderTheme; label: string }[] = [
  { key: 'light', label: 'Light' },
  { key: 'sepia', label: 'Sepia' },
  { key: 'dark', label: 'Dark' },
];

const FONT_MIN = 12;
const FONT_MAX = 28;

export function TypographyPanel({ visible, prefs, onChange, onDismiss }: Props) {
  const c = useColors();
  const bumpFont = (delta: number) => {
    const next = Math.max(FONT_MIN, Math.min(FONT_MAX, prefs.fontPx + delta));
    onChange({ fontPx: next });
  };

  return (
    <BottomSheet visible={visible} onDismiss={onDismiss} heightRatio={0.55}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: c.fg }]}>Reading</Text>
      </View>

      <View style={styles.body}>
        <Section label="Font">
          <View style={styles.row}>
            {FONTS.map((f) => {
              const active = prefs.fontFamily === f.key;
              return (
                <Pressable
                  key={f.key}
                  onPress={() => onChange({ fontFamily: f.key })}
                  style={[
                    styles.tile,
                    {
                      backgroundColor: active ? c.fg : c.bgSunken,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.tileLabel,
                      {
                        color: active ? c.accentFg : c.fg,
                        fontFamily:
                          f.key === 'serif-jp' || f.key === 'sans-jp'
                            ? fontFamily.jp
                            : fontFamily.ui,
                      },
                    ]}
                  >
                    {f.label}
                  </Text>
                  <Text
                    style={[
                      styles.tileSub,
                      { color: active ? c.accentFg : c.fgMuted },
                    ]}
                  >
                    {f.jp}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Section>

        <Section label="Size">
          <View style={[styles.sizeRow, { backgroundColor: c.bgSunken }]}>
            <Pressable onPress={() => bumpFont(-2)} hitSlop={6} style={styles.sizeBtn}>
              <Text style={[styles.sizeIcon, { color: c.fg }]}>−</Text>
            </Pressable>
            <Text
              style={[
                styles.sizePreview,
                { color: c.fg, fontSize: prefs.fontPx },
              ]}
            >
              A
            </Text>
            <Pressable onPress={() => bumpFont(2)} hitSlop={6} style={styles.sizeBtn}>
              <Text style={[styles.sizeIcon, { color: c.fg }]}>+</Text>
            </Pressable>
          </View>
        </Section>

        <Section label="Line height">
          <View style={styles.row}>
            {LINE_HEIGHTS.map((lh) => {
              const active = Math.abs(prefs.lineHeight - lh) < 0.01;
              return (
                <Pressable
                  key={lh}
                  onPress={() => onChange({ lineHeight: lh })}
                  style={[
                    styles.lhTile,
                    { backgroundColor: active ? c.fg : c.bgSunken },
                  ]}
                >
                  <Text
                    style={[
                      styles.lhLabel,
                      { color: active ? c.accentFg : c.fg },
                    ]}
                  >
                    {lh.toFixed(1)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Section>

        <Section label="Theme">
          <View style={styles.row}>
            {THEMES.map((t) => {
              const active = prefs.theme === t.key;
              const swatch = READER_THEMES[t.key];
              return (
                <Pressable
                  key={t.key}
                  onPress={() => onChange({ theme: t.key })}
                  style={[
                    styles.themeTile,
                    {
                      backgroundColor: swatch.bg,
                      borderColor: active ? c.accent : c.border,
                      borderWidth: active ? 2 : StyleSheet.hairlineWidth,
                    },
                  ]}
                >
                  <Text style={[styles.themeLabel, { color: swatch.fg }]}>
                    {t.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Section>
      </View>
    </BottomSheet>
  );
}

function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  const c = useColors();
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionLabel, { color: c.fgMuted }]}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 22, paddingTop: 4, paddingBottom: 12 },
  title: { fontSize: fontSize.lg, fontWeight: '600' },
  body: { paddingHorizontal: 18, paddingBottom: 24, gap: spacing.md },
  section: { gap: 8 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    paddingHorizontal: 4,
  },
  row: { flexDirection: 'row', gap: 6 },
  tile: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  tileLabel: { fontSize: 17, fontWeight: '500' },
  tileSub: { fontSize: 11, marginTop: 2 },
  sizeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 4,
    minHeight: 50,
  },
  sizeBtn: { paddingHorizontal: 12, paddingVertical: 6 },
  sizeIcon: { fontSize: 22, fontWeight: '500' },
  sizePreview: {
    flex: 1,
    textAlign: 'center',
    fontWeight: '500',
  },
  lhTile: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  lhLabel: { fontSize: 13, fontWeight: '500' },
  themeTile: {
    flex: 1,
    paddingVertical: 18,
    borderRadius: 10,
    alignItems: 'center',
  },
  themeLabel: { fontSize: 13, fontWeight: '500' },
});

import { StyleSheet, Text, View } from 'react-native';
import { Touchable } from '@/shared/components/Touchable';
import Feather from '@expo/vector-icons/Feather';
import { useColors } from '@/theme/ThemeContext';
import { fontFamily, radius } from '@/theme/tokens';
import {
  READER_THEMES,
  type ReaderFont,
  type ReaderPrefs,
  type ReaderTheme,
} from '../../lib/readerStorage';

// Pure settings content: font, size, line height, theme. The dock provides
// the surrounding frame and handle.
//
// The flow and direction segments are gone -- a reflowable book has no reading
// mode to choose any more; it runs on foliate's own defaults (see readerLayout).

type Props = {
  prefs: ReaderPrefs;
  onChange: (patch: Partial<ReaderPrefs>) => void;
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
const FONT_STEP = 2;

export function SettingsPane({ prefs, onChange }: Props) {
  const c = useColors();

  const bumpFont = (delta: number) => {
    const next = Math.max(FONT_MIN, Math.min(FONT_MAX, prefs.fontPx + delta));
    if (next !== prefs.fontPx) onChange({ fontPx: next });
  };

  const bumpLine = (delta: 1 | -1) => {
    const idx = closestLineHeightIndex(prefs.lineHeight);
    const nextIdx = Math.max(0, Math.min(LINE_HEIGHTS.length - 1, idx + delta));
    const next = LINE_HEIGHTS[nextIdx]!;
    if (Math.abs(next - prefs.lineHeight) > 0.001) onChange({ lineHeight: next });
  };

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: c.fg, fontFamily: fontFamily.jp }]}>設定</Text>
        <Text style={[styles.kicker, { color: c.fgMuted, fontFamily: fontFamily.ui }]}>READING</Text>
      </View>

      <View style={styles.body}>
        <Row label="Font" colors={c}>
          <View style={styles.fontRow}>
            {FONTS.map((f) => {
              const active = prefs.fontFamily === f.key;
              return (
                <Touchable
                  minTarget={false}
                  key={f.key}
                  onPress={() => onChange({ fontFamily: f.key })}
                  style={[
                    styles.fontCard,
                    {
                      backgroundColor: c.bgElev,
                      borderColor: active ? c.fg : c.border,
                      borderWidth: active ? 1.5 : StyleSheet.hairlineWidth,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.fontGlyph,
                      {
                        color: c.fg,
                        fontFamily:
                          f.key === 'serif-jp' || f.key === 'sans-jp'
                            ? fontFamily.jp
                            : fontFamily.ui,
                      },
                    ]}
                  >
                    {f.label}
                  </Text>
                  <Text style={[styles.fontSub, { color: c.fgMuted, fontFamily: fontFamily.ui }]}>
                    {f.jp}
                  </Text>
                </Touchable>
              );
            })}
          </View>
        </Row>

        <Row label="Size" colors={c}>
          <Stepper
            colors={c}
            value={`${prefs.fontPx}px`}
            onMinus={() => bumpFont(-FONT_STEP)}
            onPlus={() => bumpFont(FONT_STEP)}
            minusDisabled={prefs.fontPx <= FONT_MIN}
            plusDisabled={prefs.fontPx >= FONT_MAX}
          />
        </Row>

        <Row label="Line" colors={c}>
          <Stepper
            colors={c}
            value={prefs.lineHeight.toFixed(1)}
            onMinus={() => bumpLine(-1)}
            onPlus={() => bumpLine(1)}
            minusDisabled={closestLineHeightIndex(prefs.lineHeight) === 0}
            plusDisabled={closestLineHeightIndex(prefs.lineHeight) === LINE_HEIGHTS.length - 1}
          />
        </Row>

        <Row label="Theme" colors={c}>
          <View style={styles.swatchRow}>
            {THEMES.map((t) => {
              const active = prefs.theme === t.key;
              const swatch = READER_THEMES[t.key];
              return (
                <Touchable
                  minTarget={false}
                  key={t.key}
                  onPress={() => onChange({ theme: t.key })}
                  accessibilityLabel={`Theme: ${t.label}`}
                  style={[
                    styles.swatch,
                    {
                      backgroundColor: swatch.bg,
                      borderColor: active ? c.fg : c.border,
                      borderWidth: active ? 1.5 : StyleSheet.hairlineWidth,
                    },
                  ]}
                >
                  <Text style={[styles.swatchGlyph, { color: swatch.fg, fontFamily: fontFamily.jp }]}>あ</Text>
                </Touchable>
              );
            })}
          </View>
        </Row>

      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Atoms (private to this pane for now; lift if reused)
// ─────────────────────────────────────────────────────────────────────────────

function closestLineHeightIndex(value: number): number {
  let bestI = 0;
  let bestDelta = Infinity;
  LINE_HEIGHTS.forEach((lh, i) => {
    const d = Math.abs(lh - value);
    if (d < bestDelta) {
      bestDelta = d;
      bestI = i;
    }
  });
  return bestI;
}

function Row({
  label,
  colors: c,
  children,
}: {
  label: string;
  colors: ReturnType<typeof useColors>;
  children: React.ReactNode;
}) {
  return (
    <View style={[styles.row, { borderTopColor: c.border }]}>
      <Text style={[styles.rowLabel, { color: c.fgMuted, fontFamily: fontFamily.ui }]}>
        {label}
      </Text>
      <View style={styles.rowControl}>{children}</View>
    </View>
  );
}

function Stepper({
  colors: c,
  value,
  onMinus,
  onPlus,
  minusDisabled,
  plusDisabled,
}: {
  colors: ReturnType<typeof useColors>;
  value: string;
  onMinus: () => void;
  onPlus: () => void;
  minusDisabled?: boolean;
  plusDisabled?: boolean;
}) {
  return (
    <View style={[styles.stepper, { backgroundColor: c.bgSunken, borderColor: c.border }]}>
      <Touchable
        surface="glass"
        radius={radius.pill}
        minTarget={false}
        hitSlop={8}
        onPress={onMinus}
        disabled={minusDisabled}
        style={[styles.stepperBtn, { opacity: minusDisabled ? 0.3 : 1 }]}
      >
        <Feather name="minus" size={14} color={c.fgMuted} />
      </Touchable>
      <Text style={[styles.stepperValue, { color: c.fg, fontVariant: ['tabular-nums'] }]}>
        {value}
      </Text>
      <Touchable
        surface="glass"
        radius={radius.pill}
        minTarget={false}
        hitSlop={8}
        onPress={onPlus}
        disabled={plusDisabled}
        style={[styles.stepperBtn, { opacity: plusDisabled ? 0.3 : 1 }]}
      >
        <Feather name="plus" size={14} color={c.fg} />
      </Touchable>
    </View>
  );
}

const styles = StyleSheet.create({
  // Deliberately not flex:1 -- the dock's settings box takes ITS height from
  // this content, so stretching to fill would be circular.
  root: {},
  header: {
    paddingHorizontal: 22,
    paddingTop: 4,
    paddingBottom: 6,
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  title: { fontSize: 22, fontWeight: '600' },
  kicker: {
    fontSize: 10,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  body: { paddingHorizontal: 22, paddingBottom: 10 },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 9,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 16,
  },
  rowLabel: {
    fontSize: 11,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    width: 56,
  },
  rowControl: { flex: 1, alignItems: 'flex-end' },

  fontRow: { flexDirection: 'row', gap: 8 },
  fontCard: {
    minWidth: 64,
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  fontGlyph: { fontSize: 18, fontWeight: '500' },
  fontSub: {
    fontSize: 9,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginTop: 4,
  },

  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    minWidth: 130,
    justifyContent: 'space-between',
  },
  // A padded glyph became a real control when it took the glass wash: 32×28
  // is the box, `hitSlop` carries the target the rest of the way to 44.
  stepperBtn: {
    width: 32,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperValue: {
    fontSize: 13,
    fontWeight: '500',
    minWidth: 44,
    textAlign: 'center',
  },

  swatchRow: { flexDirection: 'row', gap: 10 },
  swatch: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatchGlyph: { fontSize: 16, fontWeight: '500' },

});

import { Pressable, StyleSheet, Text, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { useColors } from '@/theme/ThemeContext';
import { fontFamily, radius } from '@/theme/tokens';
import {
  READER_THEMES,
  type ReaderFont,
  type ReaderPrefs,
  type ReaderTheme,
} from '../../utils/readerStorage';
import type { ReaderDirection, ReaderLayout } from '../../utils/readerLayout';

// Pure settings content (font / size / line / theme + flow/view segs).
// The dock provides the surrounding frame, handle, and animation.

type Props = {
  prefs: ReaderPrefs;
  layout: ReaderLayout;
  direction: ReaderDirection;
  onChange: (patch: Partial<ReaderPrefs>) => void;
  onLayoutChange: (patch: { layout?: ReaderLayout; direction?: ReaderDirection }) => void;
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

export function SettingsPane({
  prefs,
  layout,
  direction,
  onChange,
  onLayoutChange,
}: Props) {
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
                <Pressable
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
                </Pressable>
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
                <Pressable
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
                </Pressable>
              );
            })}
          </View>
        </Row>

        <Row label="Flow" colors={c}>
          <Seg
            colors={c}
            options={[
              { key: 'continuous', icon: 'menu', label: 'Scroll' },
              { key: 'pages', icon: 'file-text', label: 'Pages' },
            ]}
            value={layout}
            onChange={(v) => onLayoutChange({ layout: v as ReaderLayout })}
          />
        </Row>

        <Row label="View" colors={c}>
          <Seg
            colors={c}
            options={[
              { key: 'horizontal', icon: 'columns', label: 'Horiz' },
              { key: 'vertical', icon: 'align-left', label: 'Vert' },
            ]}
            value={direction}
            onChange={(v) => onLayoutChange({ direction: v as ReaderDirection })}
          />
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
      <Pressable
        onPress={onMinus}
        disabled={minusDisabled}
        hitSlop={6}
        style={({ pressed }) => [
          styles.stepperBtn,
          { opacity: minusDisabled ? 0.3 : pressed ? 0.6 : 1 },
        ]}
      >
        <Feather name="minus" size={14} color={c.fgMuted} />
      </Pressable>
      <Text style={[styles.stepperValue, { color: c.fg, fontVariant: ['tabular-nums'] }]}>
        {value}
      </Text>
      <Pressable
        onPress={onPlus}
        disabled={plusDisabled}
        hitSlop={6}
        style={({ pressed }) => [
          styles.stepperBtn,
          { opacity: plusDisabled ? 0.3 : pressed ? 0.6 : 1 },
        ]}
      >
        <Feather name="plus" size={14} color={c.fg} />
      </Pressable>
    </View>
  );
}

function Seg<T extends string>({
  colors: c,
  options,
  value,
  onChange,
}: {
  colors: ReturnType<typeof useColors>;
  options: { key: T; icon: React.ComponentProps<typeof Feather>['name']; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <View style={[styles.seg, { backgroundColor: c.bgSunken, borderColor: c.border }]}>
      {options.map((opt) => {
        const active = opt.key === value;
        return (
          <Pressable
            key={opt.key}
            onPress={() => onChange(opt.key)}
            style={[
              styles.segChip,
              active && {
                backgroundColor: c.bgElev,
                borderColor: c.borderStrong,
                borderWidth: StyleSheet.hairlineWidth,
              },
            ]}
            accessibilityLabel={opt.label}
            accessibilityState={{ selected: active }}
          >
            <Feather name={opt.icon} size={12} color={active ? c.fg : c.fgMuted} />
            <Text
              style={[
                styles.segLabel,
                { color: active ? c.fg : c.fgMuted, fontWeight: active ? '600' : '500' },
              ]}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
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
  body: { paddingHorizontal: 22, paddingBottom: 24 },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
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
    paddingVertical: 10,
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
  stepperBtn: { paddingHorizontal: 8, paddingVertical: 4 },
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

  seg: {
    flexDirection: 'row',
    padding: 2,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  segChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
    borderColor: 'transparent',
  },
  segLabel: { fontSize: 11, letterSpacing: 0.4 },
});

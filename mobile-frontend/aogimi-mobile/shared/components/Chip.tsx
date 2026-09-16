import { useMemo } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { Touchable } from './Touchable';
import { usePalette } from '@/theme/ThemeContext';
import { radius, spacing, type, type Palette } from '@/theme/tokens';

/**
 * **The control chip** — DESIGN.md's "Filter chip row": a 12px rectangle on
 * Tier 1 glass, 12px label, with an optional count separated by a 6px gap
 * (`All 340`). Active takes the sakura fill and `#2A1A24` ink.
 *
 * Pressable or not: a chip with no `onPress` is a passive label and renders as
 * a plain `View`, so a screen reader is not told there is a button where there
 * is none.
 *
 * `size="sm"` is the 28pt chip the Home cards use for deck shortcuts and recent
 * lookups; `md` is the 32pt filter chip. Both are the same object at two
 * densities — a chip inside a card is smaller than a chip on the canvas.
 */
export function Chip({
  label,
  count,
  active = false,
  japanese = false,
  size = 'md',
  onPress,
  accessibilityLabel,
  style,
}: {
  label: string;
  /** Rendered bold after a faint separator dot. */
  count?: number;
  active?: boolean;
  /** Sets the label in Noto rather than Switzer — for chips whose content is a
   *  word rather than a name (`仰ぎ見る`, `木漏れ日`). */
  japanese?: boolean;
  size?: 'sm' | 'md';
  onPress?: () => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const p = usePalette();
  const s = useStyles(p);

  const body = (
    <>
      <Text
        style={[s.label, japanese && s.jp, active && s.labelActive]}
        numberOfLines={1}
      >
        {label}
      </Text>
      {count !== undefined && (
        <>
          <Text style={[s.sep, active && s.labelActive]}>·</Text>
          <Text style={[s.count, active && s.labelActive]}>{count}</Text>
        </>
      )}
    </>
  );

  const box = [s.chip, size === 'sm' ? s.sm : s.md, active && s.active, style];

  if (!onPress) {
    return <View style={[box, !active && s.passive]}>{body}</View>;
  }

  return (
    <Touchable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      // The glass wash draws the fill and hairline for the inactive state; an
      // active chip paints over it with the sakura fill.
      surface={active ? 'none' : 'glass'}
      radius={radius.control}
      minTarget={false}
      hitSlop={8}
      style={box}
    >
      {body}
    </Touchable>
  );
}

/**
 * **The 6px tag** — JLPT levels, parts of speech, state labels (`DUE NOW`,
 * `MASTERED`), the small badges that sit beside a headword.
 *
 * `tone` is the whole design: DESIGN.md builds every tag from one colour at
 * three strengths — fill at 0.16, border at 0.35, label at full. So a caller
 * passes the hue that *means* something (a JLPT level, an SRS grade, a rank
 * from `RANK_COLORS`) and gets the chip for free, instead of five near-copies
 * of this component with their own alphas.
 *
 * `tone` must be a hex; an `rgba()` token cannot be re-alpha'd. `jlptN5` is the
 * one palette value that is already alpha, and `JlptChip` handles it.
 */
export function Tag({
  label,
  tone,
  style,
}: {
  label: string;
  tone: string;
  style?: StyleProp<ViewStyle>;
}) {
  const p = usePalette();
  const s = useStyles(p);
  return (
    <View
      style={[s.tag, { backgroundColor: alpha(tone, 0.16), borderColor: alpha(tone, 0.35) }, style]}
    >
      <Text allowFontScaling={false} style={[s.tagLabel, { color: tone }]}>
        {label}
      </Text>
    </View>
  );
}

/**
 * Re-alpha a `#rrggbb`. Returns the input untouched if it is not one — which is
 * what makes passing an already-alpha token degrade to "use it as-is" rather
 * than crash.
 */
export function alpha(hex: string, a: number): string {
  const m = hex.match(/^#?([0-9a-f]{6})$/i);
  if (!m) return hex;
  const n = parseInt(m[1]!, 16);
  return `rgba(${(n >> 16) & 0xff}, ${(n >> 8) & 0xff}, ${n & 0xff}, ${a})`;
}

function useStyles(p: Palette) {
  return useMemo(
    () =>
      StyleSheet.create({
        chip: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          borderRadius: radius.control,
          paddingHorizontal: spacing.md - 2,
        },
        sm: { height: 28 },
        md: { height: 32 },
        /** A non-pressable chip cannot use `Touchable`'s glass wash, so it
         *  draws the Tier 1 recipe itself. */
        passive: {
          backgroundColor: p.glassSubtle,
          borderWidth: 1,
          borderColor: p.glassBorder,
          borderTopColor: p.glassRim,
        },
        active: { backgroundColor: p.btn },

        label: { ...type.caption, color: p.ink, flexShrink: 1 },
        jp: { fontFamily: type.titleReading.fontFamily, fontSize: 12 },
        labelActive: { color: p.btnInk },
        sep: { ...type.caption, color: p.faint },
        count: { ...type.caption, fontFamily: type.headlineMd.fontFamily, color: p.ink },

        tag: {
          borderRadius: radius.chip,
          borderWidth: 1,
          paddingHorizontal: 6,
          paddingVertical: 2,
        },
        tagLabel: {
          fontFamily: type.headlineMd.fontFamily,
          fontSize: 10,
          fontWeight: '700',
          lineHeight: 14,
          letterSpacing: 0.2,
        },
      }),
    [p],
  );
}

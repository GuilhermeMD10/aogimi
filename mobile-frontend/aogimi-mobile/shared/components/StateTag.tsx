import { useMemo } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { usePalette, type, type Palette } from '@/theme';

/** DESIGN.md's status dot. */
const DOT = 6;

/**
 * **A dot and a word** — DESIGN.md's state tag: a 6px dot and a label in one
 * colour, the colour being the whole message.
 *
 * `tone` comes from the caller because the ladder does not live here: rank
 * colours are `RANK_COLORS` in `features/sky/map/lib/palette.ts`, and
 * `shared/` cannot import from `features/`. A caller passes the hue for the
 * rank (or `accentDeep` for `DUE NOW`) and the tag draws it twice.
 *
 * Two sizes, as the compositions draw them: `sm` is the 10px uppercase tracked
 * tag on a list row, `md` the 14px state line inside the inspector.
 */
export function StateTag({
  label,
  tone,
  size = 'sm',
  style,
}: {
  label: string;
  tone: string;
  size?: 'sm' | 'md';
  style?: StyleProp<ViewStyle>;
}) {
  const p = usePalette();
  const s = useStyles(p);
  return (
    <View style={[s.row, style]}>
      <View style={[s.dot, { backgroundColor: tone }]} />
      <Text style={[size === 'sm' ? s.sm : s.md, { color: tone }]} numberOfLines={1}>
        {size === 'sm' ? label.toUpperCase() : label}
      </Text>
    </View>
  );
}

function useStyles(p: Palette) {
  return useMemo(
    () =>
      StyleSheet.create({
        row: { flexDirection: 'row', alignItems: 'center', gap: 5 },
        // A dot, by definition — half its own box, not a token radius.
        dot: { width: DOT, height: DOT, borderRadius: DOT / 2 },
        sm: { ...type.eyebrow, letterSpacing: 0.6 },
        md: { ...type.bodySm, fontFamily: type.headerTitle.fontFamily, fontSize: 14, color: p.ink },
      }),
    [p],
  );
}

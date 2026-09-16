import { useMemo } from 'react';
import { StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';
import { InnerPlate } from './Card';
import { usePalette } from '@/theme/ThemeContext';
import { spacing, type, type Palette } from '@/theme/tokens';

/**
 * **A figure with a name** — DESIGN.md's stat tile: Tier 1, radius 12, padding
 * 14; eyebrow 10px uppercase in `faint`, the value at 26px in a colour that
 * means something, and an optional mono meta line under it.
 *
 * `tone` is the value's ink — a mastery colour from `RANK_COLORS`, a supporting
 * accent — and defaults to `ink`. `unit` sits inline after the value at 12px
 * in `muted` (`18.4 days`), so the number and its unit are one line without
 * the unit shouting.
 */
export function StatTile({
  eyebrow,
  value,
  unit,
  meta,
  tone,
  style,
}: {
  eyebrow: string;
  /** Already formatted. `—` for "no figure yet". */
  value: string;
  unit?: string;
  meta?: string;
  tone?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const p = usePalette();
  const s = useStyles(p);
  return (
    <InnerPlate style={[s.tile, style]}>
      <Text style={s.eyebrow} numberOfLines={1}>
        {eyebrow}
      </Text>
      <Text style={[s.value, { color: tone ?? p.ink }]} numberOfLines={1}>
        {value}
        {unit !== undefined && <Text style={s.unit}>{` ${unit}`}</Text>}
      </Text>
      {meta !== undefined && (
        <Text style={s.meta} numberOfLines={1}>
          {meta}
        </Text>
      )}
    </InnerPlate>
  );
}

function useStyles(p: Palette) {
  return useMemo(
    () =>
      StyleSheet.create({
        tile: { padding: spacing.md + 2, gap: spacing.xs },
        eyebrow: { ...type.eyebrow, color: p.faint, textTransform: 'uppercase' },
        /** 26/600 → 700 at this size, in the bold cut `screenTitle` names. */
        value: {
          fontFamily: type.screenTitle.fontFamily,
          fontSize: 26,
          fontWeight: '700',
          lineHeight: 32,
          fontVariant: ['tabular-nums'],
        },
        unit: { ...type.caption, color: p.muted },
        meta: { ...type.monoMeta, color: p.faint },
      }),
    [p],
  );
}

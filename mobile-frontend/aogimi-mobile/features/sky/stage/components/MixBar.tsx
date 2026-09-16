import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { RANK_COLORS } from '@/features/sky/map/lib/palette';
import { usePalette } from '@/theme/ThemeContext';
import { useT } from '@/lib/i18n/I18nContext';
import { spacing, type, type Palette } from '@/theme/tokens';
import { MIX_ORDER, type MasteryMix } from '../lib/masteryMix';

/** DESIGN.md's mastery distribution bar: 12pt tall, radius 6. */
const BAR_H = 12;
const DOT = 8;

/**
 * The mastery mix: a stacked bar, one segment per tier sized by count, with a
 * 2×2 legend under it — DESIGN.md's "Mastery distribution bar".
 *
 * **Tier colours come from `RANK_COLORS`, the sky's own ramp** — the same array
 * the stars are drawn from — so the bar and the map can never disagree. The
 * redesign brief (§2) keeps our ramp over the handoff's mastery ladder for
 * exactly this reason: a legend dot and its star must be the same colour.
 * `MIX_ORDER`'s index is the sky's 0..3 rank, so the two arrays line up by
 * construction.
 *
 * The bar reads low → high (new on the left), the order the ladder is climbed;
 * the composition draws it the other way round, which is a data point, not a
 * rule — the legend reads the same in either direction.
 */
export function MixBar({ mix }: { mix: MasteryMix | null }) {
  const p = usePalette();
  const t = useT();
  const s = useStyles(p);
  const total = mix ? MIX_ORDER.reduce((n, st) => n + mix[st], 0) : 0;

  return (
    <View style={s.root}>
      <View style={s.bar}>
        {mix &&
          total > 0 &&
          MIX_ORDER.map((st, i) =>
            mix[st] > 0 ? (
              <View key={st} style={{ flex: mix[st], backgroundColor: RANK_COLORS[i] }} />
            ) : null,
          )}
      </View>
      <View style={s.legend}>
        {MIX_ORDER.map((st, i) => (
          <View key={st} style={s.cell}>
            <View style={s.cellLabel}>
              <View style={[s.dot, { backgroundColor: RANK_COLORS[i] }]} />
              <Text style={s.label}>{t(`sky.rank.${st}`)}</Text>
            </View>
            <Text style={s.count}>{mix ? mix[st].toLocaleString() : '—'}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function useStyles(p: Palette) {
  return useMemo(
    () =>
      StyleSheet.create({
        root: { gap: spacing.sm + 2 },
        bar: {
          height: BAR_H,
          borderRadius: BAR_H / 2,
          backgroundColor: p.track,
          flexDirection: 'row',
          overflow: 'hidden',
        },
        legend: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 6 },
        cell: {
          width: '50%',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingRight: spacing.md,
        },
        cellLabel: { flexDirection: 'row', alignItems: 'center', gap: 6 },
        // A dot, by definition — half its own box, not a token radius.
        dot: { width: DOT, height: DOT, borderRadius: DOT / 2 },
        label: { ...type.bodySm, fontSize: 14, color: p.muted },
        count: {
          ...type.bodySm,
          fontSize: 14,
          fontFamily: type.headlineMd.fontFamily,
          fontWeight: '700',
          color: p.ink,
          fontVariant: ['tabular-nums'],
        },
      }),
    [p],
  );
}

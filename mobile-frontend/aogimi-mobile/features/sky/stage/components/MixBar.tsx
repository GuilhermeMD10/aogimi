import { StyleSheet, Text, View } from 'react-native';

import { RANK_COLORS, RANK_LABELS } from '@/features/sky/map/lib/palette';
import { fontFamily, palette, radius } from '@/theme/tokens';
import { MIX_ORDER, type MasteryMix } from '../lib/masteryMix';

/**
 * The mastery mix: a stacked bar, one segment per tier sized by count, with a
 * dot legend under it.
 *
 * **Tier colours come from `RANK_COLORS`, the sky's own ramp** — the same array
 * the stars are drawn from — so the bar and the map can never disagree. This is
 * the fix the TODO's token-bridge note asks for: the legacy `success`/`warning`
 * bridge collapses a four-rank ladder onto two colours, which is wrong wherever
 * the ladder is the actual subject. `MIX_ORDER`'s index is the sky's 0..3 rank,
 * so the two arrays line up by construction.
 */
export function MixBar({ mix, barHeight = 8 }: { mix: MasteryMix | null; barHeight?: number }) {
  const total = mix ? MIX_ORDER.reduce((n, s) => n + mix[s], 0) : 0;

  return (
    <View style={styles.root}>
      <View style={[styles.bar, { height: barHeight, backgroundColor: palette.track }]}>
        {mix &&
          total > 0 &&
          MIX_ORDER.map((s, i) =>
            mix[s] > 0 ? (
              <View key={s} style={{ flex: mix[s], backgroundColor: RANK_COLORS[i] }} />
            ) : null,
          )}
      </View>
      <View style={styles.legend}>
        {MIX_ORDER.map((s, i) => (
          <View key={s} style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: RANK_COLORS[i] }]} />
            <Text style={[styles.legendLabel, { color: palette.muted }]}>{RANK_LABELS[i]}</Text>
            <Text style={[styles.legendValue, { color: palette.ink }]}>
              {mix ? mix[s].toLocaleString() : '—'}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { minWidth: 0 },
  bar: { flexDirection: 'row', overflow: 'hidden', borderRadius: radius.sm },
  legend: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 14, rowGap: 4, marginTop: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  // Decorative circle, so a literal rather than a radius token — the no-inline-
  // borderRadius rule is about token-relevant surfaces.
  dot: { width: 7, height: 7, borderRadius: 999 },
  legendLabel: { fontFamily: fontFamily.mono, fontSize: 9.5 },
  legendValue: { fontFamily: fontFamily.mono, fontSize: 9.5, fontWeight: '700' },
});

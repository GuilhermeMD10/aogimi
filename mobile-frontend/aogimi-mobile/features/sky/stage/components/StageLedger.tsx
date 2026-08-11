import { StyleSheet, Text, View } from 'react-native';

import { RANK_COLORS } from '@/features/sky/map/lib/palette';
import { fontFamily, palette, radius, spacing } from '@/theme/tokens';
import type { MasteryMix } from '../lib/masteryMix';
import { NIGHT } from '../lib/nightChrome';
import { MixBar } from './MixBar';

/**
 * The stage's stat band — outer tier only, gone while a deck is focused.
 *
 * **Three figures where the web has four.** The web opens with DAYS STUDIED;
 * nothing on mobile computes a streak (`profile/lib/statsApi.ts` returns
 * per-state counts and totals only, which is why the Home screen left its streak
 * pill out too), and inventing one here would mean a number that disagrees with
 * Home. It goes in with the backend query, not before.
 *
 * **The band sits at the top, not the bottom, and has one size.** Same reason as
 * the web: a deck's cell is ~500 world units tall before a single star, so the
 * outer chooser is height-starved from about eight decks up — it is the *height*
 * of the free window that decides how large a deck card can be drawn. Chrome
 * parked at the bottom would come straight off that axis, and a band that could
 * expand would take it back unpredictably.
 */

type Props = {
  /** `null` = still loading; the figure shows a dash rather than a wrong 0. */
  stars: number | null;
  dueToday: number | null;
  mastered: number | null;
  mix: MasteryMix | null;
};

export function StageLedger({ stars, dueToday, mastered, mix }: Props) {
  return (
    <View style={styles.root}>
      <View style={styles.stats}>
        <Stat label="STARS" value={stars} color={palette.ink} />
        <Stat label="DUE TODAY" value={dueToday} color={palette.gold} />
        {/* The ladder's top tier, in the ladder's own colour — not `success`. */}
        <Stat label="MASTERED" value={mastered} color={RANK_COLORS[3]} />
      </View>
      <MixBar mix={mix} />
    </View>
  );
}

function Stat({ label, value, color }: { label: string; value: number | null; color: string }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statLabel, { color: palette.faint }]}>{label}</Text>
      <Text style={[styles.statValue, { color }]}>
        {value === null ? '—' : value.toLocaleString()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: NIGHT.glass,
    borderColor: palette.bdB,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  stats: { flexDirection: 'row', gap: spacing.xl },
  stat: { gap: 5 },
  statLabel: { fontFamily: fontFamily.mono, fontSize: 8.5, letterSpacing: 1.3 },
  // Tabular figures so the numbers don't shift width as they land.
  statValue: { fontFamily: fontFamily.mono, fontSize: 20, fontWeight: '700', fontVariant: ['tabular-nums'] },
});

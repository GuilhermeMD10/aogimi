import { StyleSheet, Text, View } from 'react-native';
import { Touchable } from '@/shared/components/Touchable';
import { useColors } from '@/theme/ThemeContext';
import { fontFamily, fontSize, palette, radius } from '@/theme/tokens';
import { RANK_COLORS } from '@/features/sky/map/lib/palette';
import { SyncPill } from '@/features/books/library/components/SyncPill';
import { MIX_ORDER } from '../lib/masteryMix';
import { displayedRank } from '../../lib/fsrs';
import type { CardState, LocalCard } from '../types';

type Props = {
  card: LocalCard;
  onPress: () => void;
};

export function CardGridItem({ card, onPress }: Props) {
  const c = useColors();
  // **Draw the displayed rank, not `state`.** Once a card has reached Learned
  // its rank never visibly falls again: the badge is a record of what the user
  // achieved, and taking it away after one bad morning punishes them for the
  // algorithm's own (correct) pessimism about a lapse. Below Learned the two
  // are identical — there is no achievement yet to protect.
  //
  // The lost stability isn't hidden, it just shows on a different axis:
  // retrievability, which the sky will draw as star brightness.
  const rank = displayedRank(card.peak_rank, card.state);
  const chip = chipColors(rank);

  return (
    <Touchable
      minTarget={false}
      onPress={onPress}
      style={[styles.root, { backgroundColor: c.bgElev, borderColor: c.border }]}
    >
      {/* Synced cards don't display any badge — only the unsynced ones
          get a small blue dot to nudge the user toward Sync now. */}
      {card.syncState === 'pending' && (
        <View style={styles.pillSlot}>
          <SyncPill state="unsynced" variant="dot" />
        </View>
      )}
      <View style={[styles.chip, { backgroundColor: chip.bg }]}>
        <Text style={[styles.chipText, { color: chip.fg }]}>{rank}</Text>
      </View>
      <Text style={[styles.front, { color: c.fg }]} numberOfLines={1}>
        {card.front}
      </Text>
      {card.reading.length > 0 && (
        <Text style={[styles.reading, { color: c.fgMuted }]} numberOfLines={1}>
          {card.reading}
        </Text>
      )}
    </Touchable>
  );
}

/**
 * The rank chip's colours.
 *
 * **Not its own hues.** Mixing local greens and ambers at 10–20% alpha made
 * the fills invisible on device, and approximating four ranks with two hues
 * (`learned` and `mastered` both taking `success`) left two of them identical.
 *
 * It reads `RANK_COLORS` instead — the sky's own ladder, indexed by `MIX_ORDER`
 * exactly as `MixBar`, `StageLedger` and `CardDetailSheet` already do, so the
 * grid can never disagree with the star map or the bars. Four ranks, four
 * plainly different colours, on the one opaque sunken fill.
 */
function chipColors(state: CardState): { bg: string; fg: string } {
  const i = MIX_ORDER.indexOf(state);
  return { bg: palette.paperTile, fg: RANK_COLORS[i] ?? palette.ink };
}

const styles = StyleSheet.create({
  root: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    alignItems: 'center',
    gap: 4,
    position: 'relative',
  },
  pillSlot: { position: 'absolute', top: 6, right: 6 },
  chip: {
    alignSelf: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.pill,
    marginBottom: 8,
  },
  chipText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  front: {
    fontFamily: fontFamily.jp,
    fontSize: 22,
    fontWeight: '500',
    textAlign: 'center',
  },
  reading: {
    fontFamily: fontFamily.jp,
    fontSize: fontSize.xs + 1,
    textAlign: 'center',
  },
});

import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Touchable } from '@/shared/components/Touchable';
import Feather from '@expo/vector-icons/Feather';

import { RANK_COLORS, RANK_LABELS } from '@/features/sky/map/lib/palette';
import { JlptChip } from '@/shared/components/JlptChip';
import { fontFamily, fontSize, palette, radius, spacing } from '@/theme/tokens';
import { shownRank } from '../../lib/skyProjection';
import { MIX_ORDER } from '../lib/masteryMix';
import { NIGHT } from '../lib/nightChrome';
import type { LocalCard } from '../types';

/**
 * The ringed star's card, as a panel docked to the bottom of the stage.
 *
 * **A docked panel, not a modal `BottomSheet`.** The shared sheet renders in a
 * `Modal` over a scrim, which is right for a form you have to finish — and wrong
 * here: the whole point of the focused tier is that you can see the star you
 * selected. A scrim would black out the sky the panel is describing, and a modal
 * would swallow the pan/pinch gestures that still belong to the camera. So this
 * is an ordinary absolutely-positioned view, and the view's `insets` shrink the
 * camera's fit by its height so the ringed star is never underneath it.
 *
 * Closing is the × here, tapping empty sky, or Android back — the tier walk
 * treats a selected card as one level in (card → deck → sky).
 *
 * Deliberately absent, matching the web's card detail:
 *   - **part of speech** — nothing on a `cards` row records one; it would have
 *     to be a snapshot column captured at add time, the way `jlpt_level` is;
 *   - **an example translation** — `context_sentence` stores the sentence alone.
 */

type Props = {
  card: LocalCard;
  onClose: () => void;
  /** Opens the view's confirm step; the deletion itself happens there. */
  onRequestDelete: () => void;
};

export function CardDetailSheet({ card, onClose, onRequestDelete }: Props) {
  // The *displayed* rank, not the raw column: a card that reached Learned keeps
  // its tier through a lapse, and this badge sits beside a star already drawn
  // that way. `MIX_ORDER` index is the sky's 0..3 rank, so the two ramps align.
  const rank = shownRank(card);
  const rankIndex = MIX_ORDER.indexOf(rank);
  const rankColor = RANK_COLORS[rankIndex];

  // Cards created before migration 026 carry their glosses inside `back`
  // instead, which is why this falls back rather than showing an empty block.
  const meanings = card.meanings.length > 0 ? card.meanings : null;

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <View style={styles.headword}>
          <Text style={styles.front} numberOfLines={2}>
            {card.front}
          </Text>
          {card.reading.length > 0 && (
            <Text style={styles.reading} numberOfLines={1}>
              {card.reading}
            </Text>
          )}
        </View>
        <Touchable
          minTarget={false}
          hitSlop={10}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close card"
          style={styles.iconBtn}
        >
          <Feather name="x" size={16} color={palette.ink} />
        </Touchable>
      </View>

      <View style={styles.chips}>
        <View style={[styles.rankChip, { borderColor: rankColor }]}>
          <View style={[styles.rankDot, { backgroundColor: rankColor }]} />
          <Text style={[styles.rankLabel, { color: rankColor }]}>{RANK_LABELS[rankIndex]}</Text>
        </View>
        {card.jlpt_level !== null && <JlptChip level={card.jlpt_level} />}
        <Text style={styles.reviews}>
          {card.reviewed_times.toLocaleString()}{' '}
          {card.reviewed_times === 1 ? 'REVIEW' : 'REVIEWS'}
        </Text>
      </View>

      <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
        {meanings ? (
          meanings.map((m, i) => (
            <View key={`${m}-${i}`} style={styles.meaningRow}>
              <Text style={styles.meaningIndex}>{i + 1}</Text>
              <Text style={styles.meaning}>{m}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.meaning}>{card.back}</Text>
        )}

        {card.context_sentence.length > 0 && (
          <Text style={styles.context}>{card.context_sentence}</Text>
        )}
        {card.notes.length > 0 && <Text style={styles.notes}>{card.notes}</Text>}
      </ScrollView>

      <Touchable
        minTarget={false}
        onPress={onRequestDelete}
        accessibilityRole="button"
        accessibilityLabel={`Delete ${card.front}`}
        style={styles.delete}
      >
        <Feather name="trash-2" size={14} color={palette.danger} />
        <Text style={styles.deleteLabel}>Delete card</Text>
      </Touchable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: NIGHT.panel,
    borderColor: palette.bdB,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.md,
  },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  headword: { flex: 1, minWidth: 0, gap: 3 },
  front: {
    color: palette.ink,
    fontFamily: fontFamily.jpSans,
    fontSize: fontSize.xxl,
    fontWeight: '700',
  },
  reading: { color: palette.soft, fontFamily: fontFamily.jpSans, fontSize: fontSize.sm },
  iconBtn: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: palette.tintB,
  },
  chips: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.sm },
  rankChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  rankDot: { width: 6, height: 6, borderRadius: 999 },
  rankLabel: { fontFamily: fontFamily.mono, fontSize: 9.5, letterSpacing: 0.8 },
  reviews: { color: palette.faint, fontFamily: fontFamily.mono, fontSize: 9.5, letterSpacing: 0.8 },
  // Capped so a card with many meanings can't grow the panel past the sky it
  // describes; the camera inset is measured from the rendered height either way.
  body: { maxHeight: 180 },
  meaningRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: 5 },
  meaningIndex: {
    color: palette.accent,
    fontFamily: fontFamily.mono,
    fontSize: fontSize.xs,
    lineHeight: 20,
  },
  meaning: { flex: 1, color: palette.soft, fontFamily: fontFamily.ui, fontSize: fontSize.sm, lineHeight: 20 },
  context: {
    color: palette.muted,
    fontFamily: fontFamily.jpSans,
    fontSize: fontSize.sm,
    lineHeight: 22,
    marginTop: spacing.sm,
  },
  notes: {
    color: palette.faint,
    fontFamily: fontFamily.ui,
    fontSize: fontSize.xs,
    lineHeight: 18,
    marginTop: spacing.sm,
  },
  delete: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: radius.md,
    backgroundColor: palette.dangerBg,
    borderColor: palette.dangerBd,
    borderWidth: StyleSheet.hairlineWidth,
  },
  deleteLabel: {
    color: palette.danger,
    fontFamily: fontFamily.ui,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
});

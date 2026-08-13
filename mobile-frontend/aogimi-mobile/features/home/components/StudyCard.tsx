import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import type { DeckRecord } from '@/features/sky/stage/types';
import { deckGlyphFor } from '@/features/sky/stage/lib/deckVisuals';
import { usePalette } from '@/theme/ThemeContext';
import { fontFamily, fontSize, radius, spacing, type Palette } from '@/theme/tokens';
import { Card } from './HomeCard';

/**
 * The due-cards card: a count, one chip per deck with something due, and the
 * button into a session.
 *
 * ── Why the button can be disabled ──────────────────────────────────────────
 * Since the FSRS-6 port a review only counts if the card is *due* — grading
 * early changes no stability, writes no `card_reviews` row and moves no star.
 * A session opened with nothing due would hand out cards whose answers silently
 * do nothing, so the button refuses instead. (Practice-ahead is a separate
 * affordance that belongs on the sky stage, not here.)
 *
 * ── The chips are navigation ────────────────────────────────────────────────
 * Each chip carries a deck's own due count, so tapping one opens *that deck's*
 * session rather than the mixed one. Only decks with something due get a chip —
 * `byDeck` omits the zeroes, so the filter and the data agree by construction.
 */
export function StudyCard({
  total,
  decks,
  countFor,
  dueLabel,
  studyLabel,
  onStudyAll,
  onStudyDeck,
}: {
  /** Cards due across every deck. */
  total: number;
  /** Decks with at least one card due. */
  decks: DeckRecord[];
  countFor: (deckId: string) => number;
  /** Already pluralised, e.g. "cards due". */
  dueLabel: string;
  studyLabel: string;
  onStudyAll: () => void;
  onStudyDeck: (deckId: string) => void;
}) {
  const p = usePalette();
  const styles = useStyles(p);
  const nothingDue = total === 0;

  return (
    <Card>
      <View style={styles.head}>
        <Text style={styles.count}>{total}</Text>
        <Text style={styles.countLabel}>{dueLabel}</Text>
      </View>

      {decks.length > 0 && (
        <View style={styles.chipRow}>
          {decks.map((d) => (
            <Pressable
              key={d.id}
              onPress={() => onStudyDeck(d.id)}
              accessibilityRole="button"
              style={styles.chip}
            >
              <Text style={styles.chipLabel}>
                {deckGlyphFor(d.name)} {d.name} · {countFor(d.id)}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      <Pressable
        onPress={onStudyAll}
        disabled={nothingDue}
        accessibilityRole="button"
        accessibilityState={{ disabled: nothingDue }}
        style={[styles.button, nothingDue && styles.buttonDisabled]}
      >
        <Feather name="star" size={13} color={p.btnInk} />
        <Text style={styles.buttonLabel}>{studyLabel}</Text>
      </Pressable>
    </Card>
  );
}

function useStyles(p: Palette) {
  return useMemo(
    () =>
      StyleSheet.create({
        head: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm },
        count: {
          fontFamily: fontFamily.ui,
          fontSize: 30,
          fontWeight: '700',
          lineHeight: 32,
          color: p.ink,
        },
        countLabel: {
          fontFamily: fontFamily.ui,
          fontSize: fontSize.sm,
          fontWeight: '700',
          color: p.soft,
        },

        chipRow: {
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: spacing.sm - 1,
          marginTop: spacing.md - 1,
        },
        // `paperTile` on `paper`: the chip is an inset *within* the card, which
        // is the pair that token is judged against — not against the canvas.
        chip: {
          paddingVertical: 6,
          paddingHorizontal: 11,
          borderRadius: radius.xl,
          backgroundColor: p.paperTile,
          borderWidth: 1,
          borderColor: p.paperBd,
        },
        chipLabel: {
          fontFamily: fontFamily.ui,
          fontSize: fontSize.xs + 0.5,
          fontWeight: '700',
          color: p.soft,
        },

        button: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: spacing.sm,
          height: 44,
          borderRadius: radius.md,
          backgroundColor: p.btn,
          marginTop: spacing.md + 1,
        },
        buttonDisabled: { opacity: 0.4 },
        buttonLabel: {
          fontFamily: fontFamily.ui,
          fontSize: fontSize.sm + 0.5,
          fontWeight: '700',
          color: p.btnInk,
        },
      }),
    [p],
  );
}

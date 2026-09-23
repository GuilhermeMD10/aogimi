import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Card, Button, Chip } from '@/shared/components';
import type { DeckRecord } from '@/features/sky/stage/types';
import { usePalette, spacing, type, type Palette } from '@/theme';

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
 *
 * ── The four SRS tiles are not built ────────────────────────────────────────
 * The handoff draws an Again / Hard / Good / Easy shelf under the CTA. It is
 * decorative there — Home has no card in front of the user to grade, and the
 * intervals it shows belong to a review that has not started. The owner
 * confirmed they do not belong on this screen. They are the study runner's, and
 * that screen builds them for real.
 */
export function StudyCard({
  total,
  decks,
  countFor,
  dueTitle,
  studyLabel,
  dueBadge,
  onStudyAll,
  onStudyDeck,
}: {
  /** Cards due across every deck. */
  total: number;
  /** Decks with at least one card due. */
  decks: DeckRecord[];
  countFor: (deckId: string) => number;
  /** Already interpolated, e.g. `48 Cards Due`. */
  dueTitle: string;
  studyLabel: string;
  /** The CTA's trailing count, e.g. `48 DUE`. */
  dueBadge: string;
  onStudyAll: () => void;
  onStudyDeck: (deckId: string) => void;
}) {
  const p = usePalette();
  const styles = useStyles(p);
  const nothingDue = total === 0;

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>{dueTitle}</Text>

      {decks.length > 0 && (
        <View style={styles.chipRow}>
          {decks.map((d) => (
            <Chip
              key={d.id}
              label={d.name}
              count={countFor(d.id)}
              size="sm"
              onPress={() => onStudyDeck(d.id)}
            />
          ))}
        </View>
      )}

      <Button
        label={studyLabel}
        // No badge when nothing is due: "0 DUE" beside a dead button is two
        // ways of saying the same thing, and the count reads as a promise.
        badge={nothingDue ? undefined : dueBadge}
        icon="star"
        onPress={onStudyAll}
        disabled={nothingDue}
        full
      />
    </Card>
  );
}

function useStyles(p: Palette) {
  return useMemo(
    () =>
      StyleSheet.create({
        card: { gap: spacing.md },
        title: { ...type.headlineMd, color: p.ink },
        chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
      }),
    [p],
  );
}

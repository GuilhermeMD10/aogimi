import { StyleSheet, View } from 'react-native';
import { Button, MeaningRow } from '@/shared/components';
import { useT } from '@/lib/i18n/I18nContext';
import { spacing } from '@/theme/tokens';
import type { WordDetails } from '../types';
import { isEnglish, posLabel } from '../lib';
import { SectionHeading } from './SectionHeading';
import { EntryHeader } from './EntryHeader';
import { KanjiBreakdownCard } from './KanjiBreakdownCard';
import { ExampleBlock } from './ExampleBlock';

/** Meanings shown before the list is cut. The entry is a reference surface, so
 *  this is generous; the result card shows three. */
const MAX_MEANINGS = 12;

/**
 * A word entry — the tab's detail frame and the reader drawer's detail page,
 * one component at two scales.
 *
 * No handoff draws it, so this is the previous layout re-skinned onto the
 * primitives: the primary `Button`, `MeaningRow` plates for the senses, `Card`s
 * for the kanji, hairlined examples.
 *
 * `compact` is the drawer's step-down: smaller headword, one example. It owns
 * **no** width, fill, edge, scroll or padding — the surface around it supplies
 * the box, which is what lets a 60%-height sheet and a full page share this
 * file.
 */
export function EntryView({
  details,
  query,
  compact = false,
  onAddToDeck,
  onKanjiPress,
}: {
  details: WordDetails;
  query?: string;
  compact?: boolean;
  onAddToDeck: () => void;
  /** Starts a fresh search for that character. Omitted where there is no
   *  search stack to push onto. */
  onKanjiPress?: (literal: string) => void;
}) {
  const t = useT();

  const { word, kanjis, sentences } = details;
  const meanings = word.meanings.filter((m) => isEnglish(m.lang)).slice(0, MAX_MEANINGS);
  const primaryPos = posLabel(word.meanings[0]?.pos);
  // The drawer is a 60% sheet over the reader — five sentences there would bury
  // the meanings the user opened it for.
  const examples = compact ? sentences.slice(0, 1) : sentences;

  return (
    <View style={styles.root}>
      <EntryHeader word={word} query={query} compact={compact} />

      {/* The page's one primary action. Inline rather than floating: a FAB has
          to be positioned above the dock by hand and covers the last line of
          the entry; a button in the flow needs neither. */}
      <Button label={t('dict.addToDeck')} icon="plus" full onPress={onAddToDeck} />

      {meanings.length > 0 && (
        <View style={styles.block}>
          <SectionHeading label={t('dict.meanings')} />
          <View style={styles.rows}>
            {meanings.map((m, i) => {
              const rowPos = posLabel(m.pos);
              return (
                <MeaningRow
                  key={i}
                  index={i + 1}
                  text={m.meaning}
                  // Only when this sense's part of speech differs from the
                  // entry's — otherwise it repeats the header's chip on every
                  // line.
                  meta={rowPos !== null && rowPos !== primaryPos ? rowPos : undefined}
                />
              );
            })}
          </View>
        </View>
      )}

      {kanjis.length > 0 && (
        <View style={styles.block}>
          <SectionHeading label={t('dict.kanjiInWord')} />
          <View style={styles.rows}>
            {kanjis.map((k) => (
              <KanjiBreakdownCard
                key={k.literal}
                kanji={k}
                compact={compact}
                onPress={onKanjiPress ? () => onKanjiPress(k.literal) : undefined}
              />
            ))}
          </View>
        </View>
      )}

      {examples.length > 0 && (
        <View style={styles.block}>
          <SectionHeading label={t('dict.examples')} />
          <View>
            {examples.map((s, i) => (
              <ExampleBlock key={s.id} sentence={s} divider={i > 0} compact={compact} />
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

// Layout only — every colour is inside the primitives, so this can be a
// module-scope sheet.
const styles = StyleSheet.create({
  root: { gap: spacing.xl },
  block: { gap: spacing.sm + 2 },
  rows: { gap: spacing.sm },
});

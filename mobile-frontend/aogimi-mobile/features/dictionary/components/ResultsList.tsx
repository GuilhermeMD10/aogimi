import { useCallback } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { useT } from '@/lib/i18n/I18nContext';
import { spacing } from '@/theme/tokens';
import type { KanjiInfo, WordResult } from '../types';
import type { ResultGroup, ResultRow } from '../lib/resultSections';
import { SectionHeading } from './SectionHeading';
import { ResultCard } from './ResultCard';
import { KanjiResultCard, NameResultCard } from './CharResultCard';

/**
 * The results list, shared by the dictionary tab and the reader's drawer.
 *
 * Takes pre-flattened rows from `lib/resultSections` — words, kanji entries and
 * names in one sequence with their group headings already decided — so the list
 * itself only maps a row to a card.
 *
 * `header` stays mounted across every state (the search field lives in it), so
 * the field never moves as the body swaps between the empty state and results.
 * `empty` therefore does double duty: the idle recents block *and* the
 * no-matches line, whichever the caller passes.
 */
export function ResultsList({
  rows,
  query,
  compact = false,
  header,
  empty,
  footer,
  contentStyle,
  onOpenWord,
  onAddWord,
  onAddKanji,
  onOpenKanji,
}: {
  rows: ResultRow[];
  query: string;
  compact?: boolean;
  header?: React.ReactElement;
  empty?: React.ReactElement;
  footer?: React.ReactElement;
  contentStyle?: object;
  onOpenWord: (word: WordResult) => void;
  onAddWord: (word: WordResult) => void;
  onAddKanji: (kanji: KanjiInfo) => void;
  /** Starts a fresh search for the character. Absent in the drawer, which has
   *  no frame stack to push onto. */
  onOpenKanji?: (literal: string) => void;
}) {
  const t = useT();

  const renderItem = useCallback(
    ({ item }: { item: ResultRow }) => {
      switch (item.kind) {
        case 'section':
          return (
            <View style={styles.section}>
              <SectionHeading label={t(SECTION_KEYS[item.group])} />
            </View>
          );
        case 'word':
          return (
            <ResultCard
              word={item.word}
              query={query}
              // The top word is the ranked answer; the rest are alternates.
              elevated={item.index === 0}
              compact={compact}
              addLabel={t('dict.addToDeck')}
              onPress={() => onOpenWord(item.word)}
              onAdd={() => onAddWord(item.word)}
            />
          );
        case 'kanji':
          return (
            <KanjiResultCard
              kanji={item.kanji}
              compact={compact}
              addLabel={t('dict.addToDeck')}
              onPress={onOpenKanji ? () => onOpenKanji(item.kanji.literal) : undefined}
              onAdd={() => onAddKanji(item.kanji)}
            />
          );
        case 'name':
          return <NameResultCard name={item.name} compact={compact} />;
      }
    },
    [t, query, compact, onOpenWord, onAddWord, onAddKanji, onOpenKanji],
  );

  return (
    <FlatList
      data={rows}
      keyExtractor={(row) => row.key}
      renderItem={renderItem}
      ItemSeparatorComponent={Separator}
      ListHeaderComponent={header}
      ListEmptyComponent={empty}
      ListFooterComponent={footer}
      contentContainerStyle={contentStyle}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      showsVerticalScrollIndicator={false}
    />
  );
}

/** Group → i18n key. A `Record` over the union, so a new group is a type
 *  error here rather than an untranslated heading at runtime. */
const SECTION_KEYS: Record<ResultGroup, string> = {
  words: 'dict.sectionWords',
  kanji: 'dict.sectionKanji',
  names: 'dict.sectionNames',
};

function Separator() {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  separator: { height: spacing.xs + 1 },
  section: { paddingTop: spacing.md, paddingBottom: spacing.xs },
});

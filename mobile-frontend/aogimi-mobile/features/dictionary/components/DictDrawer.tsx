import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BottomSheet } from '@/shared/components/BottomSheet';
import { IconButton } from '@/shared/components/IconButton';
import { PressableBackdrop } from '@/shared/components/Touchable';
import { useT } from '@/lib/i18n/I18nContext';
import { usePalette } from '@/theme/ThemeContext';
import { spacing, type, type Palette } from '@/theme/tokens';
import { fetchWordDetails } from '../lib/dictApi';
import { pushRecentLookup } from '../lib/dictionaryStorage';
import { resultRows, totalResults } from '../lib/resultSections';
import { useDictionarySearch } from '../hooks/useDictionarySearch';
import { useSearchKeyboard } from '../hooks/useSearchKeyboard';
import type { KanjiInfo, WordDetails, WordResult } from '../types';
import { SearchField } from './SearchField';
import { ResultsKicker } from './ResultsKicker';
import { ResultsList } from './ResultsList';
import { EntryView } from './EntryView';

/** `Reader.dc.html`'s dictionary pop-up: 60% of the screen. */
const HEIGHT_RATIO = 0.6;

/**
 * The lookup sheet raised over the reader, the study card and the star map —
 * `Reader.dc.html`'s "Dictionary pop-up": the search field, the RESULTS kicker
 * and the same result rows as the tab, inside the Tier 4 sheet.
 *
 * **Built from the tab's components, not a copy of them**, the way the web's
 * `dict-sidebar` and `reader-bubble` are built from `features/dictionary`'s
 * exports. This file supplies the box — the sheet, its padding and its scroll
 * — and the components supply none of it.
 *
 * Two states, not the tab's three: search and entry. There is no hero (the
 * sheet opens with the tapped word already queried) and no drill-down stack
 * (a 60% sheet is the wrong place to lose your way back to the book), so
 * `onOpenKanji` is deliberately not passed.
 */
export function DictDrawer({
  visible,
  term,
  onDismiss,
  onAddFlashcard,
  onAddKanji,
  children,
}: {
  visible: boolean;
  term: string;
  onDismiss: () => void;
  onAddFlashcard: (details: WordDetails) => void;
  /** A kanji result's add button. The host owns the draft builders it uses,
   *  so the sheet reports the character rather than building the card. */
  onAddKanji: (kanji: KanjiInfo) => void;
  /**
   * Sheets that have to open *over* this one — the reader passes its
   * flashcard drawer here.
   *
   * **They must be nested rather than sibling**, because `BottomSheet` is a
   * `Modal` and iOS presents one from the nearest view controller up the
   * responder chain. Two sibling modals resolve to the *same* controller, and
   * UIKit drops the second presentation on the floor ("already presenting"),
   * so the card sheet simply never appeared. Rendered inside this sheet, the
   * chain reaches this modal's own controller and the presentation lands.
   */
  children?: React.ReactNode;
}) {
  return (
    <BottomSheet visible={visible} onDismiss={onDismiss} heightRatio={HEIGHT_RATIO}>
      {/* Keyed on `term` so re-opening with a different selection remounts the
          inner stack — query, stage and search results all reseed cleanly
          without per-prop reset effects. */}
      <DictDrawerInner
        key={term || '__empty__'}
        term={term}
        onAddFlashcard={onAddFlashcard}
        onAddKanji={onAddKanji}
      />
      {children}
    </BottomSheet>
  );
}

type Stage =
  | { kind: 'search' }
  | { kind: 'detailLoading' }
  | { kind: 'detail'; details: WordDetails };

function DictDrawerInner({
  term,
  onAddFlashcard,
  onAddKanji,
}: {
  term: string;
  onAddFlashcard: (details: WordDetails) => void;
  onAddKanji: (kanji: KanjiInfo) => void;
}) {
  const t = useT();
  const p = usePalette();
  const styles = useStyles(p);

  const { inputRef, dismiss } = useSearchKeyboard();
  const [query, setQuery] = useState(term);
  const [stage, setStage] = useState<Stage>({ kind: 'search' });
  const [error, setError] = useState<string | null>(null);

  // Only the state: the sheet stays on page one. A 60% overlay over a book is
  // the wrong place to grow an unbounded list — the tab is where you go to
  // work through every match. Wiring `loadMore` here is a one-line change if
  // that judgement turns out wrong.
  const { state: searchState } = useDictionarySearch(query);
  const rows = useMemo(
    () => (searchState.kind === 'results' ? resultRows(searchState.response) : []),
    [searchState],
  );
  const total = searchState.kind === 'results' ? totalResults(searchState.response) : 0;

  const openWord = useCallback(
    (word: WordResult) => {
      // Same rule as the tab: anything that navigates closes the keyboard, and
      // the sheet is only 60% of the screen, so a keyboard left up over it hides
      // the entry the tap just opened.
      dismiss();
      setError(null);
      setStage({ kind: 'detailLoading' });
      fetchWordDetails(word.id)
        .then((details) => {
          setStage({ kind: 'detail', details });
          // A lookup from inside the reader counts the same as one from the
          // dictionary tab — one store, every surface. `query` rather than the
          // tapped term: the user may have edited the selection before
          // picking, and the edited text is what should pick the headword.
          void pushRecentLookup(details.word, query);
        })
        .catch((err: unknown) => {
          setError(err instanceof Error ? err.message : t('common.error'));
          setStage({ kind: 'search' });
        });
    },
    [query, t, dismiss],
  );

  // A result row holds a `WordResult`, and example sentences hang off the
  // *entry*, so the add circle resolves the entry before handing it up. It used
  // to synthesise `{ word, kanjis: [], sentences: [] }`, which meant a card
  // added from the list saved with no context sentence while the same word
  // added from its entry saved with one.
  //
  // Not the round trip it reads as: the dictionary is bundled SQLite behind an
  // LRU cache (`lib/dictApi`), the same read `openWord` does — and in the
  // reader this only supplies the *fallback* anyway, since a selection the user
  // tapped in the book already carries its own sentence, which wins.
  const addWordFromRow = useCallback(
    async (word: WordResult) => {
      // A lookup that fails still adds the card, just without the context.
      const details = await fetchWordDetails(word.id).catch(() => null);
      onAddFlashcard(details ?? { word, kanjis: [], sentences: [] });
    },
    [onAddFlashcard],
  );

  if (stage.kind === 'detail') {
    return (
      <View style={styles.flex}>
        <View style={styles.header}>
          <IconButton
            glyph="back"
            accessibilityLabel={t('dict.backToResults')}
            onPress={() => {
              dismiss();
              setStage({ kind: 'search' });
            }}
          />
        </View>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <EntryView
            details={stage.details}
            query={query}
            compact
            onAddToDeck={() => onAddFlashcard(stage.details)}
          />
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      {stage.kind === 'detailLoading' ? (
        <View style={styles.centered}>
          <ActivityIndicator color={p.muted} />
        </View>
      ) : (
        <ResultsList
          rows={rows}
          query={query}
          contentStyle={styles.scroll}
          onOpenWord={openWord}
          onAddWord={(word) => {
            dismiss();
            void addWordFromRow(word);
          }}
          onAddKanji={(kanji) => {
            dismiss();
            onAddKanji(kanji);
          }}
          onScrollStart={dismiss}
          header={
            <PressableBackdrop onPress={dismiss} style={styles.header}>
              <SearchField
                ref={inputRef}
                value={query}
                onChangeText={setQuery}
                placeholder={t('dict.fieldPlaceholder')}
                onSubmit={dismiss}
                clearLabel={t('dict.clearSearch')}
              />
              {error !== null && <Text style={styles.error}>{error}</Text>}
              {total > 0 && (
                <ResultsKicker
                  label={t('dict.results')}
                  countLabel={t('dict.resultsFor', {
                    count: searchState.kind === 'results' && searchState.response.hasMore
                      ? `${total}+`
                      : total,
                  })}
                  query={query.trim()}
                />
              )}
            </PressableBackdrop>
          }
          empty={
            query.trim() === '' ? (
              <Text style={styles.hint}>{t('dict.empty')}</Text>
            ) : searchState.kind === 'loading' ? (
              <ActivityIndicator color={p.muted} style={styles.spinner} />
            ) : searchState.kind === 'error' ? (
              <Text style={[styles.error, styles.centeredText]}>{searchState.message}</Text>
            ) : (
              <Text style={styles.hint}>{t('dict.noResults', { query: query.trim() })}</Text>
            )
          }
        />
      )}
    </View>
  );
}

function useStyles(p: Palette) {
  return useMemo(
    () =>
      StyleSheet.create({
        flex: { flex: 1 },
        // The sheet supplies the horizontal inset for everything inside it,
        // including the list — the components carry none. The composition
        // stacks grabber, field, kicker and rows 14pt apart.
        header: {
          paddingTop: spacing.sm,
          paddingHorizontal: spacing.screenX,
          paddingBottom: spacing.stackGap,
          gap: spacing.stackGap,
        },
        scroll: { paddingHorizontal: spacing.screenX, paddingBottom: spacing.xl },
        centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
        centeredText: { textAlign: 'center', paddingHorizontal: spacing.screenX },
        spinner: { marginTop: spacing.lg },
        error: { ...type.bodySm, color: p.danger },
        hint: {
          ...type.bodySm,
          color: p.muted,
          textAlign: 'center',
          marginTop: spacing.xl,
          paddingHorizontal: spacing.xl,
        },
      }),
    [p],
  );
}

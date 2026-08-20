import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { BottomSheet } from '@/shared/components/BottomSheet';
import { PressableBackdrop, Touchable } from '@/shared/components/Touchable';
import { useT } from '@/lib/i18n/I18nContext';
import { usePalette } from '@/theme/ThemeContext';
import { fontFamily, fontSize, spacing, type Palette } from '@/theme/tokens';
import { fetchWordDetails } from '../lib/dictApi';
import { pushRecentLookup } from '../lib/dictionaryStorage';
import { resultRows } from '../lib/resultSections';
import { useDictionarySearch } from '../hooks/useDictionarySearch';
import { useSearchKeyboard } from '../hooks/useSearchKeyboard';
import type { KanjiInfo, WordDetails, WordResult } from '../types';
import { SearchField } from './SearchField';
import { ResultsList } from './ResultsList';
import { EntryView } from './EntryView';

/**
 * The reader's lookup sheet — the dictionary at `compact` scale.
 *
 * **Built from the tab's components, not a copy of them**, the way the web's
 * `dict-sidebar` and `reader-bubble` are built from `features/dictionary`'s
 * exports. `SearchField`, `ResultsList` and `EntryView` each take a `compact`
 * flag carrying the type and spacing step-down; this file supplies the box —
 * the sheet, its padding and its scroll — and the components supply none of it.
 *
 * Two states, not the tab's three: search and entry. There is no hero (the
 * sheet opens with the tapped word already queried) and no drill-down stack
 * (a 65% sheet is the wrong place to lose your way back to the book), so
 * `onOpenKanji` is deliberately not passed.
 */
export function DictDrawer({
  visible,
  term,
  onDismiss,
  onAddFlashcard,
  onAddKanji,
}: {
  visible: boolean;
  term: string;
  onDismiss: () => void;
  onAddFlashcard: (details: WordDetails) => void;
  /** A kanji result's add button. The reader owns the draft builders it uses,
   *  so the sheet reports the character rather than building the card. */
  onAddKanji: (kanji: KanjiInfo) => void;
}) {
  return (
    <BottomSheet visible={visible} onDismiss={onDismiss} heightRatio={0.65}>
      {/* Keyed on `term` so re-opening with a different selection remounts the
          inner stack — query, stage and search results all reseed cleanly
          without per-prop reset effects. */}
      <DictDrawerInner
        key={term || '__empty__'}
        term={term}
        onAddFlashcard={onAddFlashcard}
        onAddKanji={onAddKanji}
      />
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

  const searchState = useDictionarySearch(query);
  const rows = useMemo(
    () => (searchState.kind === 'results' ? resultRows(searchState.response) : []),
    [searchState],
  );

  const openWord = useCallback(
    (word: WordResult) => {
      // Same rule as the tab: anything that navigates closes the keyboard, and
      // the sheet is only 65% of the screen, so a keyboard left up over it hides
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

  if (stage.kind === 'detail') {
    return (
      <View style={styles.flex}>
        <View style={styles.header}>
          <Touchable
            onPress={() => {
              dismiss();
              setStage({ kind: 'search' });
            }}
            accessibilityRole="button"
            minTarget={false}
            style={styles.backLink}
          >
            <Feather name="chevron-left" size={13} color={p.muted} />
            <Text style={styles.backLabel}>{t('dict.backToResults')}</Text>
          </Touchable>
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
          compact
          contentStyle={styles.scroll}
          onOpenWord={openWord}
          onAddWord={(word) => {
            dismiss();
            onAddFlashcard({ word, kanjis: [], sentences: [] });
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
                active={query.trim() !== ''}
                compact
                onSubmit={dismiss}
                clearLabel={t('dict.clearSearch')}
              />
              {error !== null && <Text style={styles.error}>{error}</Text>}
            </PressableBackdrop>
          }
          empty={
            query.trim() === '' ? (
              <Text style={styles.hint}>{t('dict.empty')}</Text>
            ) : searchState.kind === 'loading' ? (
              <ActivityIndicator color={p.muted} style={styles.spinner} />
            ) : searchState.kind === 'error' ? (
              <Text style={styles.error}>{searchState.message}</Text>
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
        // including the list — the components carry none.
        header: { paddingHorizontal: spacing.xl - 2, paddingBottom: spacing.md },
        scroll: { paddingHorizontal: spacing.xl - 2, paddingBottom: spacing.xl },
        centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
        spinner: { marginTop: spacing.lg },
        backLink: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 5,
          paddingVertical: spacing.xs,
        },
        backLabel: {
          fontFamily: fontFamily.mono,
          fontSize: fontSize.xs - 1,
          letterSpacing: 1.2,
          textTransform: 'uppercase',
          color: p.muted,
        },
        error: {
          fontFamily: fontFamily.ui,
          fontSize: fontSize.sm,
          color: p.danger,
          marginTop: spacing.sm,
        },
        hint: {
          fontFamily: fontFamily.ui,
          fontSize: fontSize.sm,
          color: p.muted,
          textAlign: 'center',
          marginTop: spacing.xl,
          paddingHorizontal: spacing.xl,
        },
      }),
    [p],
  );
}

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { useFocusEffect, useLocalSearchParams, useNavigation } from 'expo-router';
import { Screen } from '@/shared/components/Screen';
import { useDockClearance } from '@/features/app-shell/Dock';
import { FlashcardDrawer, type FlashcardPrefill } from '@/features/sky/stage/components/FlashcardDrawer';
import { useT } from '@/lib/i18n/I18nContext';
import { usePalette } from '@/theme/ThemeContext';
import { fontFamily, fontSize, spacing, type Palette } from '@/theme/tokens';
import type { KanjiInfo, WordDetails, WordResult } from '../types';
import { useDictionaryNav } from '../hooks/useDictionaryNav';
import { useDictionarySearch } from '../hooks/useDictionarySearch';
import { kanjiCardDraft, wordCardDraft } from '../lib/cardDraft';
import { getRecentLookups, pushRecentLookup, type RecentLookup } from '../lib/dictionaryStorage';
import { resultRows, totalResults } from '../lib/resultSections';
import { SearchField } from '../components/SearchField';
import { DictHero } from '../components/DictHero';
import { SuggestionChips } from '../components/SuggestionChips';
import { SectionHeading } from '../components/SectionHeading';
import { RecentLookupRow } from '../components/RecentLookupRow';
import { ResultsList } from '../components/ResultsList';
import { EntryView } from '../components/EntryView';

/**
 * The dictionary tab.
 *
 * **Composition and data only** — every visual piece is a component in
 * `../components`, each reading `usePalette()` with a memoised style factory.
 * Order: hero, field, suggestions, recents; then field, count, results; then
 * entry.
 *
 * ── Why a stack, not three flat states ──────────────────────────────────────
 * The tab is a **frame stack** (`useDictionaryNav`): tapping a kanji inside an
 * entry pushes a fresh *search* frame, so a user can drill 辞書 → 辞 → 辭典 →
 * … and unwind one step at a time. Android's hardware back and re-tapping the
 * tab both pop it.
 *
 * ── Recents are lookups, not queries ─────────────────────────────────────────
 * One store — see `lib/dictionaryStorage.ts`. This list and Home's card are
 * the same data, a row here opens the exact word rather than re-running a
 * search, and a word looked up in the reader appears in both.
 */
export function DictionaryView() {
  const t = useT();
  const p = usePalette();
  const styles = useStyles(p);
  const dockClearance = useDockClearance();

  const { current, canGoBack, query, setQuery, openDetail, openKanjiSearch, back, detailError } =
    useDictionaryNav();

  const searchState = useDictionarySearch(query);
  const [prefill, setPrefill] = useState<FlashcardPrefill | null>(null);
  const [recents, setRecents] = useState<RecentLookup[]>([]);

  // Re-tapping the Dictionary tab while inside a detail / loading frame pops
  // one step in the in-app stack instead of re-focusing the (already focused)
  // tab. Mirrors the Android hardware-back behaviour.
  const navigation = useNavigation();
  useEffect(() => {
    type TabPressEvent = { preventDefault: () => void };
    const unsub = navigation.addListener('tabPress' as never, ((e: TabPressEvent) => {
      if (canGoBack) {
        e.preventDefault();
        back();
      }
    }) as never);
    return unsub;
  }, [navigation, canGoBack, back]);

  // Read on focus, not once on mount: the reader's drawer writes to the same
  // store, so a word looked up mid-session has to appear here without an app
  // restart. Home does the same for the same reason.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      void getRecentLookups().then((next) => {
        if (!cancelled) setRecents(next);
      });
      return () => {
        cancelled = true;
      };
    }, []),
  );

  // ── Deep link: `?word=<id>&n=<nonce>` opens that entry directly ────────────
  // Home's recent-lookup rows arrive here. The id, not a query string, because
  // the user already chose an entry — re-running a *search* could land them on
  // a different word with the same spelling.
  //
  // `n` is a nonce and is load-bearing: this tab stays mounted, so pushing the
  // same `word` twice would leave the params identical and the dedupe below
  // would swallow the second tap.
  const { word: wordParam, n: nonceParam } = useLocalSearchParams<{ word?: string; n?: string }>();
  const handledLinkRef = useRef<string | null>(null);
  useEffect(() => {
    if (!wordParam) return;
    const token = `${wordParam}:${nonceParam ?? ''}`;
    if (handledLinkRef.current === token) return;
    handledLinkRef.current = token;
    const id = Number(wordParam);
    if (Number.isFinite(id)) void openDetail(id);
  }, [wordParam, nonceParam, openDetail]);

  const openWord = useCallback(
    async (id: number, lookupQuery: string) => {
      const details = await openDetail(id);
      // Written after the detail resolves, so a lookup that failed to load
      // never lands in the list. `lookupQuery` is what picks the headword —
      // see `preferredHeadword`.
      if (details) setRecents(await pushRecentLookup(details.word, lookupQuery.trim() || undefined));
    },
    [openDetail],
  );

  // Adding from a result row needs no round trip: `wordCardDraft` takes the
  // `WordResult` the list already holds. Only the entry's own button has
  // example sentences to pass, which is the one thing a row cannot supply.
  const addWord = useCallback(
    (word: WordResult) => setPrefill(wordCardDraft(word, query)),
    [query],
  );
  const addKanji = useCallback((kanji: KanjiInfo) => setPrefill(kanjiCardDraft(kanji)), []);
  const addFromEntry = useCallback(
    (details: WordDetails) => setPrefill(wordCardDraft(details.word, query, details.sentences)),
    [query],
  );

  const isSearching = query.trim() !== '';
  const rows = useMemo(
    () =>
      isSearching && searchState.kind === 'results' ? resultRows(searchState.response) : [],
    [isSearching, searchState],
  );
  const total =
    isSearching && searchState.kind === 'results' ? totalResults(searchState.response) : 0;

  const field = (
    <SearchField
      value={query}
      onChangeText={setQuery}
      placeholder={t('dict.fieldPlaceholder')}
      active={isSearching}
      clearLabel={t('dict.clearSearch')}
    />
  );

  return (
    <Screen padded>
      {current.kind === 'search' && (
        <ResultsList
          rows={rows}
          query={query}
          contentStyle={{ paddingBottom: dockClearance }}
          onOpenWord={(w) => void openWord(w.id, query)}
          onAddWord={addWord}
          onAddKanji={addKanji}
          onOpenKanji={openKanjiSearch}
          header={
            <View>
              {/* A search frame reached by drilling into a kanji sits on top of
                  another frame, so it needs its own way back — the dock's tab
                  is not one. */}
              {canGoBack && <BackLink label={t('dict.back')} onPress={back} />}

              {!isSearching && (
                <DictHero
                  kicker={t('dict.heroKicker')}
                  title={t('dict.heroTitle')}
                  caption={t('dict.heroCaption')}
                />
              )}

              <View style={styles.fieldWrap}>{field}</View>

              {!isSearching && <SuggestionChips onPick={setQuery} />}

              {detailError !== null && <Text style={styles.error}>{detailError}</Text>}

              {isSearching && searchState.kind === 'loading' && (
                <ActivityIndicator color={p.muted} style={styles.spinner} />
              )}
              {isSearching && searchState.kind === 'error' && (
                <Text style={styles.error}>{searchState.message}</Text>
              )}
              {isSearching && searchState.kind === 'results' && total > 0 && (
                <View style={styles.resultsHeading}>
                  <SectionHeading
                    label={t('dict.results')}
                    tone="accent"
                    trailing={
                      <Text style={styles.count}>
                        {t('dict.resultsFor', { count: total })}{' '}
                        <Text style={styles.countQuery}>「{query.trim()}」</Text>
                      </Text>
                    }
                  />
                </View>
              )}
            </View>
          }
          empty={
            isSearching ? (
              searchState.kind === 'results' ? (
                <Text style={styles.empty}>{t('dict.noResults', { query: query.trim() })}</Text>
              ) : undefined
            ) : (
              <RecentLookups
                recents={recents}
                label={t('dict.recentlyLookedUp')}
                onOpen={(lookup) => void openWord(lookup.wordId, lookup.headword)}
              />
            )
          }
        />
      )}

      {current.kind === 'detailLoading' && (
        <View style={styles.centered}>
          <ActivityIndicator color={p.muted} />
        </View>
      )}

      {current.kind === 'detail' && (
        <View style={styles.flex}>
          <BackLink label={t('dict.backToResults')} onPress={back} />
          <ScrollView
            contentContainerStyle={{ paddingBottom: dockClearance + spacing.lg }}
            showsVerticalScrollIndicator={false}
          >
            <EntryView
              details={current.details}
              query={query}
              onAddToDeck={() => addFromEntry(current.details)}
              onKanjiPress={openKanjiSearch}
            />
          </ScrollView>
        </View>
      )}

      <FlashcardDrawer
        visible={prefill !== null}
        prefill={prefill}
        onDismiss={() => setPrefill(null)}
      />
    </Screen>
  );
}

/** The mono "‹ BACK TO RESULTS" link above an entry. */
function BackLink({ label, onPress }: { label: string; onPress: () => void }) {
  const p = usePalette();
  const styles = useStyles(p);
  return (
    <Pressable onPress={onPress} hitSlop={12} accessibilityRole="button" style={styles.backLink}>
      <Feather name="chevron-left" size={13} color={p.muted} />
      <Text style={styles.backLabel}>{label}</Text>
    </Pressable>
  );
}

/**
 * RECENTLY LOOKED UP. Absent entirely when there is nothing in it — a first-run
 * user has no history and does not need to be told so; the hero and the
 * suggestion chips are the empty state.
 */
function RecentLookups({
  recents,
  label,
  onOpen,
}: {
  recents: RecentLookup[];
  label: string;
  onOpen: (lookup: RecentLookup) => void;
}) {
  const p = usePalette();
  const styles = useStyles(p);
  if (recents.length === 0) return null;
  return (
    <View style={styles.recents}>
      <View style={styles.recentsHeading}>
        <SectionHeading label={label} />
      </View>
      {recents.map((lookup, i) => (
        <RecentLookupRow
          key={lookup.wordId}
          lookup={lookup}
          divider={i < recents.length - 1}
          onPress={() => onOpen(lookup)}
        />
      ))}
    </View>
  );
}

function useStyles(p: Palette) {
  return useMemo(
    () =>
      StyleSheet.create({
        flex: { flex: 1 },
        fieldWrap: { marginTop: spacing.lg + 2 },
        spinner: { marginTop: spacing.xl },

        resultsHeading: { marginTop: spacing.lg, marginBottom: spacing.sm },
        count: {
          fontFamily: fontFamily.ui,
          fontSize: fontSize.sm - 1,
          color: p.muted,
        },
        countQuery: {
          fontFamily: fontFamily.jp,
          fontSize: fontSize.sm + 1,
          color: p.ink,
        },

        error: {
          fontFamily: fontFamily.ui,
          fontSize: fontSize.sm,
          color: p.danger,
          marginTop: spacing.md,
          textAlign: 'center',
        },
        empty: {
          fontFamily: fontFamily.ui,
          fontSize: fontSize.sm,
          color: p.muted,
          marginTop: spacing.xl,
          textAlign: 'center',
        },
        centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },

        recents: { marginTop: spacing.xl },
        recentsHeading: {
          paddingBottom: spacing.md - 1,
          borderBottomWidth: 1,
          borderBottomColor: p.paperBd,
        },

        backLink: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 5,
          paddingVertical: spacing.sm,
        },
        backLabel: {
          fontFamily: fontFamily.mono,
          fontSize: fontSize.xs - 1,
          letterSpacing: 1.2,
          textTransform: 'uppercase',
          color: p.muted,
        },
      }),
    [p],
  );
}

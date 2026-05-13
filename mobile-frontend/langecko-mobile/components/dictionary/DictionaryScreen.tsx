import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { Screen } from '@/components/ui/Screen';
import { useColors } from '@/theme/ThemeContext';
import { useT } from '@/lib/i18n/I18nContext';
import { fontFamily, fontSize, spacing } from '@/theme/tokens';
import { useNavVisibility } from '@/lib/navVisibility';
import type { SearchResponse, WordDetails, WordResult } from '@/lib/types';
import { FlashcardDrawer, type FlashcardPrefill } from '@/components/flashcards/FlashcardDrawer';
import { DictEntry } from './DictEntry';
import { DictResultRow } from './DictResultRow';
import { DictEmpty } from './DictEmpty';
import { useDictionarySearch } from './useDictionarySearch';
import { useDictionaryNav } from './useDictionaryNav';
import { getRecentSearches, pushRecentSearch, type RecentSearchItem } from '@/lib/storage/dictionary';

const NAV_CLAIM = 'dictionary-detail';

export function DictionaryScreen() {
  const c = useColors();

  const nav = useDictionaryNav();
  const { current, canGoBack, query, setQuery, openDetail, openKanjiSearch, back, detailError } =
    nav;

  const [flashcardPrefill, setFlashcardPrefill] = useState<FlashcardPrefill | null>(null);
  const [recents, setRecents] = useState<RecentSearchItem[]>([]);
  const searchState = useDictionarySearch(query);

  // Load recents on mount.
  useEffect(() => {
    void getRecentSearches().then(setRecents);
  }, []);

  // Hide the bottom tab bar while a detail (or its loading state) is on top.
  const { claim, release } = useNavVisibility();
  useEffect(() => {
    const inDetail = current.kind === 'detail' || current.kind === 'detailLoading';
    if (inDetail) {
      claim(NAV_CLAIM);
      return () => release(NAV_CLAIM);
    }
    return undefined;
  }, [current.kind, claim, release]);

  const addFlashcardFromDetails = useCallback((details: WordDetails) => {
    const w = details.word;
    setFlashcardPrefill({
      front: w.kanji[0] ?? w.readings[0] ?? '',
      reading: w.readings[0] ?? '',
      back:
        w.meanings
          .filter((m) => m.lang === 'eng' || m.lang === 'en')
          .slice(0, 2)
          .map((m) => m.meaning)
          .join('; ') ?? '',
    });
  }, []);

  const handleOpenDetail = useCallback(
    async (id: number, lookupQuery: string) => {
      // Push the committed query to recents the moment the user picks a
      // result — that's the strongest signal of intent in an autosearch UI.
      const trimmed = lookupQuery.trim();
      if (trimmed) {
        const next = await pushRecentSearch(trimmed);
        setRecents(next);
      }
      await openDetail(id);
    },
    [openDetail],
  );

  return (
    <Screen padded>
      {current.kind === 'search' && (
        <SearchView
          query={query}
          setQuery={setQuery}
          searchState={searchState}
          onPickResult={(id) => void handleOpenDetail(id, query)}
          errorBanner={detailError}
          canGoBack={canGoBack}
          onBack={back}
          recents={recents}
          onPickRecent={(q) => setQuery(q)}
        />
      )}

      {current.kind === 'detailLoading' && (
        <View style={styles.centered}>
          <ActivityIndicator color={c.fg} />
        </View>
      )}

      {current.kind === 'detail' && (
        <DetailView
          details={current.details}
          query={query}
          onBack={back}
          onAddFlashcard={() => addFlashcardFromDetails(current.details)}
          onKanjiPress={openKanjiSearch}
        />
      )}

      <FlashcardDrawer
        visible={flashcardPrefill !== null}
        prefill={flashcardPrefill}
        onDismiss={() => setFlashcardPrefill(null)}
      />
    </Screen>
  );
}

// ── Search view ──────────────────────────────────────────────────────────────

function SearchView({
  query,
  setQuery,
  searchState,
  onPickResult,
  errorBanner,
  canGoBack,
  onBack,
  recents,
  onPickRecent,
}: {
  query: string;
  setQuery: (v: string) => void;
  searchState: ReturnType<typeof useDictionarySearch>;
  onPickResult: (id: number) => void;
  errorBanner: string | null;
  canGoBack: boolean;
  onBack: () => void;
  recents: RecentSearchItem[];
  onPickRecent: (q: string) => void;
}) {
  const c = useColors();

  const trimmed = query.trim();
  const isSearching = trimmed !== '';

  // One scrollable list at all times. The hero card (search bar + recents)
  // is the list header so its position never shifts between empty and
  // searching states — only the body below it swaps. When searching,
  // results render as the list items; when empty, the list is empty and
  // only the card is visible.
  const header = (
    <View>
      {canGoBack && (
        <Pressable onPress={onBack} hitSlop={12} style={styles.backRow}>
          <Feather name="chevron-left" size={20} color={c.fg} />
          <Text style={[styles.backLabel, { color: c.fgMuted, fontFamily: fontFamily.ui }]}>
            Back
          </Text>
        </Pressable>
      )}
      <DictEmpty
        query={query}
        setQuery={setQuery}
        recents={recents}
        onPickRecent={onPickRecent}
        isSearching={isSearching}
      />
      {errorBanner && <Text style={[styles.error, { color: c.error }]}>{errorBanner}</Text>}
      {isSearching && (
        <View style={styles.bodyState}>
          {searchState.kind === 'loading' && (
            <ActivityIndicator color={c.fg} style={{ marginVertical: spacing.lg }} />
          )}
          {searchState.kind === 'error' && (
            <Text style={[styles.bodyError, { color: c.error }]}>{searchState.message}</Text>
          )}
        </View>
      )}
    </View>
  );

  return (
    <ResultsBody
      header={header}
      searchState={searchState}
      query={query}
      isSearching={isSearching}
      onPick={onPickResult}
    />
  );
}

function ResultsBody({
  header,
  searchState,
  query,
  isSearching,
  onPick,
}: {
  header: React.ReactElement;
  searchState: ReturnType<typeof useDictionarySearch>;
  query: string;
  isSearching: boolean;
  onPick: (id: number) => void;
}) {
  const c = useColors();
  const words =
    isSearching && searchState.kind === 'results' ? collectWords(searchState.response) : [];

  return (
    <FlatList
      style={styles.flex}
      contentContainerStyle={styles.scrollBody}
      data={words}
      keyExtractor={(w) => String(w.id)}
      renderItem={({ item, index }) => (
        <DictResultRow
          word={item}
          index={index}
          active={index === 0}
          query={query}
          onPress={() => onPick(item.id)}
        />
      )}
      ListHeaderComponent={
        <View>
          {header}
          {isSearching && searchState.kind === 'results' && words.length > 0 && (
            <View style={styles.resultsHeader}>
              <Text style={[styles.resultsKicker, { color: c.accent, fontFamily: fontFamily.ui }]}>
                Dictionary
              </Text>
              <Text
                style={[styles.resultsCount, { color: c.fg, fontFamily: fontFamily.displayBold }]}
              >
                {words.length} result{words.length !== 1 ? 's' : ''} for{' '}
                <Text style={{ color: c.accent }}>「{query}」</Text>
              </Text>
              <Text
                style={[styles.resultsSubtitle, { color: c.fgMuted, fontFamily: fontFamily.reader }]}
              >
                JMdict entries · kanji, reading, cross-reference matches
              </Text>
            </View>
          )}
        </View>
      }
      ListFooterComponent={
        isSearching && searchState.kind === 'results' ? (
          words.length === 0 ? (
            <Text
              style={[styles.noResults, { color: c.fgMuted, fontFamily: fontFamily.reader }]}
            >
              No results for “{query}”
            </Text>
          ) : (
            <View style={styles.resultsFooter}>
              <Text
                style={[styles.resultsFooterText, { color: c.fgSubtle, fontFamily: fontFamily.ui }]}
              >
                End of results
              </Text>
            </View>
          )
        ) : null
      }
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    />
  );
}

function collectWords(res: SearchResponse): WordResult[] {
  if ('words' in res) return res.words;
  return [];
}

// ── Detail view ──────────────────────────────────────────────────────────────

function DetailView({
  details,
  query,
  onBack,
  onAddFlashcard,
  onKanjiPress,
}: {
  details: WordDetails;
  query: string;
  onBack: () => void;
  onAddFlashcard: () => void;
  onKanjiPress: (literal: string) => void;
}) {
  const c = useColors();
  const t = useT();
  return (
    <View style={styles.flex}>
      <View style={styles.detailHeader}>
        <Pressable onPress={onBack} hitSlop={10} style={styles.backRow}>
          <Feather name="chevron-left" size={22} color={c.fg} />
          <Text style={[styles.backLabel, { color: c.fgMuted, fontFamily: fontFamily.ui }]}>
            Results
          </Text>
        </Pressable>
      </View>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.detailScroll}
        showsVerticalScrollIndicator={false}
      >
        <DictEntry
          word={details.word}
          kanjis={details.kanjis}
          query={query}
          onKanjiPress={onKanjiPress}
        />
      </ScrollView>
      <Pressable
        onPress={onAddFlashcard}
        accessibilityRole="button"
        accessibilityLabel={t('dict.addFlashcard')}
        style={({ pressed }) => [
          styles.fab,
          {
            backgroundColor: c.fg,
            opacity: pressed ? 0.85 : 1,
          },
        ]}
      >
        <Feather name="plus" size={20} color={c.bg} />
        <Text style={[styles.fabLabel, { color: c.bg, fontFamily: fontFamily.ui }]}>
          {t('dict.addFlashcard')}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scrollBody: {
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginBottom: spacing.md,
  },
  backLabel: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  error: { fontSize: fontSize.sm, marginTop: spacing.sm },
  bodyState: {
    alignItems: 'center',
    paddingTop: spacing.md,
  },
  bodyError: {
    fontSize: fontSize.sm,
    paddingHorizontal: spacing.md,
    textAlign: 'center',
  },
  noResults: {
    fontSize: fontSize.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    textAlign: 'center',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
  },
  resultsHeader: {
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    gap: 2,
  },
  resultsKicker: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  resultsCount: {
    fontSize: 18,
    letterSpacing: -0.3,
    marginTop: 2,
  },
  resultsSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  resultsFooter: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  resultsFooterText: {
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  detailHeader: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  detailScroll: {
    paddingTop: spacing.md,
  },
  fab: {
    position: 'absolute',
    right: 0,
    bottom: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 999,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  fabLabel: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});

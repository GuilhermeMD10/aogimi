import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { useColors } from '@/theme/ThemeContext';
import { useT } from '@/lib/i18n/I18nContext';
import { fontFamily, fontSize, radius, spacing } from '@/theme/tokens';
import { useNavVisibility } from '@/lib/navVisibility';
import type { SearchResponse, WordDetails, WordResult } from '@/lib/types';
import { FlashcardDrawer, type FlashcardPrefill } from '@/components/flashcards/FlashcardDrawer';
import { DictEntry } from './DictEntry';
import { DictResultRow } from './DictResultRow';
import { useDictionarySearch } from './useDictionarySearch';
import { useDictionaryNav } from './useDictionaryNav';

const NAV_CLAIM = 'dictionary-detail';

export function DictionaryScreen() {
  const c = useColors();
  const t = useT();

  const nav = useDictionaryNav();
  const { current, canGoBack, query, setQuery, openDetail, openKanjiSearch, back, detailError } =
    nav;

  const [flashcardPrefill, setFlashcardPrefill] = useState<FlashcardPrefill | null>(null);
  const searchState = useDictionarySearch(query);

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

  return (
    <Screen padded>
      {current.kind === 'search' && (
        <SearchView
          query={query}
          setQuery={setQuery}
          searchState={searchState}
          onPickResult={openDetail}
          errorBanner={detailError}
          canGoBack={canGoBack}
          onBack={back}
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
}: {
  query: string;
  setQuery: (v: string) => void;
  searchState: ReturnType<typeof useDictionarySearch>;
  onPickResult: (id: number) => void;
  errorBanner: string | null;
  canGoBack: boolean;
  onBack: () => void;
}) {
  const c = useColors();
  const t = useT();

  const trimmed = query.trim();

  return (
    <View style={styles.flex}>
      <View style={styles.header}>
        {canGoBack && (
          <Pressable onPress={onBack} hitSlop={12} style={{ marginBottom: spacing.xs }}>
            <Text style={[styles.back, { color: c.fgMuted }]}>‹ {t('common.back')}</Text>
          </Pressable>
        )}
        <Text style={[styles.title, { color: c.fg }]}>{t('dict.title')}</Text>
      </View>

      <View
        style={[
          styles.searchField,
          { backgroundColor: c.bgElev, borderColor: c.border },
        ]}
      >
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={t('dict.search')}
          placeholderTextColor={c.fgSubtle}
          style={[styles.searchInput, { color: c.fg }]}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
        />
        {query.length > 0 && (
          <Pressable onPress={() => setQuery('')} hitSlop={10}>
            <Text style={{ color: c.fgMuted, fontSize: fontSize.md }}>✕</Text>
          </Pressable>
        )}
      </View>

      {errorBanner && (
        <Text style={[styles.error, { color: c.error }]}>{errorBanner}</Text>
      )}

      <View style={styles.resultsWrap}>
        {trimmed === '' && (
          <View style={styles.centered}>
            <Text style={[styles.empty, { color: c.fgMuted }]}>{t('dict.empty')}</Text>
          </View>
        )}

        {searchState.kind === 'loading' && (
          <View style={styles.centered}>
            <ActivityIndicator color={c.fg} />
          </View>
        )}

        {searchState.kind === 'error' && (
          <View style={styles.centered}>
            <Text style={{ color: c.error, fontSize: fontSize.sm }}>{searchState.message}</Text>
          </View>
        )}

        {searchState.kind === 'results' && (
          <ResultsList
            response={searchState.response}
            query={searchState.query}
            onPick={onPickResult}
          />
        )}
      </View>
    </View>
  );
}

function ResultsList({
  response,
  query,
  onPick,
}: {
  response: SearchResponse;
  query: string;
  onPick: (id: number) => void;
}) {
  const c = useColors();
  const words = collectWords(response);

  if (words.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={{ color: c.fgMuted, fontSize: fontSize.sm }}>
          No results for “{query}”
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={words}
      keyExtractor={(w) => String(w.id)}
      renderItem={({ item }) => (
        <DictResultRow word={item} query={query} onPress={() => onPick(item.id)} />
      )}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ paddingBottom: spacing.xxl }}
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
  onBack,
  onAddFlashcard,
  onKanjiPress,
}: {
  details: WordDetails;
  onBack: () => void;
  onAddFlashcard: () => void;
  onKanjiPress: (literal: string) => void;
}) {
  const c = useColors();
  const t = useT();
  return (
    <View style={styles.flex}>
      <View style={styles.detailHeader}>
        <Pressable onPress={onBack} hitSlop={10}>
          <Text style={[styles.back, { color: c.fgMuted }]}>{'‹ ' + t('common.back')}</Text>
        </Pressable>
      </View>
      <View style={{ flex: 1 }}>
        <DictEntry
          word={details.word}
          kanjis={details.kanjis}
          onKanjiPress={onKanjiPress}
        />
      </View>
      <View style={[styles.detailFooter, { borderTopColor: c.border }]}>
        <Button label={t('dict.addFlashcard')} onPress={onAddFlashcard} full />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { paddingTop: spacing.md, paddingBottom: spacing.md },
  title: { fontFamily: fontFamily.displayBold, fontSize: 30, letterSpacing: -0.5 },
  searchField: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  searchInput: { flex: 1, fontSize: fontSize.md, padding: 0 },
  error: { fontSize: fontSize.sm, marginBottom: spacing.sm },
  resultsWrap: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xxl },
  empty: { fontSize: fontSize.md },
  detailHeader: { paddingTop: spacing.md, paddingBottom: spacing.md },
  back: { fontSize: fontSize.md, fontWeight: '500' },
  detailFooter: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingVertical: spacing.md,
  },
});

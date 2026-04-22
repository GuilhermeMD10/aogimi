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
import { fetchWordDetails } from '@/lib/api';
import type { SearchResponse, WordDetails, WordResult } from '@/lib/types';
import { FlashcardDrawer, type FlashcardPrefill } from '@/components/flashcards/FlashcardDrawer';
import { DictEntry } from './DictEntry';
import { DictResultRow } from './DictResultRow';
import { useDictionarySearch } from './useDictionarySearch';

type Mode =
  | { kind: 'search' }
  | { kind: 'detailLoading' }
  | { kind: 'detail'; details: WordDetails };

export function DictionaryScreen() {
  const c = useColors();
  const t = useT();

  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<Mode>({ kind: 'search' });
  const [detailError, setDetailError] = useState<string | null>(null);
  const [flashcardPrefill, setFlashcardPrefill] = useState<FlashcardPrefill | null>(null);

  const searchState = useDictionarySearch(query);

  const openDetail = useCallback(async (id: number) => {
    setDetailError(null);
    setMode({ kind: 'detailLoading' });
    try {
      const details = await fetchWordDetails(id);
      setMode({ kind: 'detail', details });
    } catch (err) {
      setDetailError(err instanceof Error ? err.message : t('common.error'));
      setMode({ kind: 'search' });
    }
  }, [t]);

  const backToSearch = useCallback(() => {
    setMode({ kind: 'search' });
  }, []);

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

  // Clear detail if the user starts a new search after landing on detail
  useEffect(() => {
    if (mode.kind !== 'search' && query.length > 0) {
      setMode({ kind: 'search' });
    }
    // only trigger when query changes meaningfully
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  return (
    <Screen padded>
      {mode.kind === 'search' && (
        <SearchView
          query={query}
          setQuery={setQuery}
          searchState={searchState}
          onPickResult={openDetail}
          errorBanner={detailError}
        />
      )}

      {mode.kind === 'detailLoading' && (
        <View style={styles.centered}>
          <ActivityIndicator color={c.fg} />
        </View>
      )}

      {mode.kind === 'detail' && (
        <DetailView
          details={mode.details}
          onBack={backToSearch}
          onAddFlashcard={() => addFlashcardFromDetails(mode.details)}
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
}: {
  query: string;
  setQuery: (v: string) => void;
  searchState: ReturnType<typeof useDictionarySearch>;
  onPickResult: (id: number) => void;
  errorBanner: string | null;
}) {
  const c = useColors();
  const t = useT();

  const trimmed = query.trim();

  return (
    <View style={styles.flex}>
      <View style={styles.header}>
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
}: {
  details: WordDetails;
  onBack: () => void;
  onAddFlashcard: () => void;
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
        <DictEntry word={details.word} kanjis={details.kanjis} />
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

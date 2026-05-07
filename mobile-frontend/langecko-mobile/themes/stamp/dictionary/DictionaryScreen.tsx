import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { useColors, useFonts, useShape } from '@/theme/ThemeContext';
import { useT } from '@/lib/i18n/I18nContext';
import { spacing } from '@/theme/tokens';
import { useNavVisibility } from '@/lib/navVisibility';
import type { SearchResponse, WordDetails, WordResult } from '@/lib/types';
import { FlashcardDrawer, type FlashcardPrefill } from '@/components/flashcards/FlashcardDrawer';
import { useDictionarySearch } from '@/components/dictionary/useDictionarySearch';
import { useDictionaryNav } from '@/components/dictionary/useDictionaryNav';
import { DictEntry } from './DictEntry';
import { StampMark } from '@/components/theme-decorations/stamp';
import { JlptChip } from '@/components/ui/JlptChip';

const SCREEN_PADDING = 22;
const NAV_CLAIM = 'dictionary-detail-stamp';

/**
 * Stamp-theme variant of the dictionary screen.
 *
 * Composition (per Stamp Agent Handoff §04.04):
 *  - Masthead: vertical 辞 書 kicker · DICT, serif title, StampMark corner
 *  - Search field: washi card with sumi border + hard offset shadow,
 *    JA/EN scope chip on the right, italic placeholder
 *  - Results list: single sumi-bordered block with dashed dividers, each
 *    row has a vermillion 01/02/03 numeral, headword, vermillion reading,
 *    italic gloss, chevron
 *  - Detail view: mono-cap "« RESULTS" back, then themed DictEntry, then
 *    primary stamp button + ghost button row
 */
export function DictionaryScreen() {
  const c = useColors();

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
    <Screen>
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

// ─────────────────────────────────────────────────────────────────────────────
// Search view
// ─────────────────────────────────────────────────────────────────────────────

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
  const f = useFonts();
  const surface = useShape().surface;
  const t = useT();

  const trimmed = query.trim();

  return (
    <View style={styles.flex}>
      {/* ── Masthead ──────────────────────────────────────────────────── */}
      <View style={styles.masthead}>
        <View style={{ flex: 1 }}>
          {canGoBack && (
            <Pressable onPress={onBack} hitSlop={12} style={{ marginBottom: 6 }}>
              <Text
                allowFontScaling={false}
                style={{
                  fontFamily: f.mono,
                  fontSize: 11,
                  letterSpacing: 1.6,
                  color: c.fgMuted,
                  textTransform: 'uppercase',
                }}
              >
                « {t('common.back')}
              </Text>
            </Pressable>
          )}
          <Text
            allowFontScaling={false}
            style={{
              fontFamily: f.mono,
              fontSize: 10,
              letterSpacing: 2.4,
              color: c.accent,
              textTransform: 'uppercase',
            }}
          >
            辞 書 · DICT
          </Text>
          <Text
            allowFontScaling={false}
            style={{
              fontFamily: f.displayBold,
              fontSize: 44,
              color: c.fg,
              letterSpacing: -0.5,
              marginTop: 6,
              lineHeight: 46,
            }}
          >
            Dictionary
          </Text>
          <Text
            allowFontScaling={false}
            style={{
              fontFamily: f.ui,
              fontStyle: 'italic',
              fontSize: 13,
              color: c.fgMuted,
              marginTop: 8,
              maxWidth: 260,
              lineHeight: 18,
            }}
          >
            kanji · kana · or English
          </Text>
        </View>
        <View style={{ marginLeft: 6, marginTop: 4 }}>
          <StampMark size={64} rotate={-7}>
            字
          </StampMark>
        </View>
      </View>

      <View style={{ height: 2, backgroundColor: c.fg, marginBottom: spacing.lg }} />

      {/* ── Search field ──────────────────────────────────────────────── */}
      <View style={{ paddingHorizontal: SCREEN_PADDING }}>
        <View
          style={[
            styles.searchField,
            {
              backgroundColor: c.bgElev,
              borderColor: surface.borderColor,
              borderWidth: surface.borderWidth,
              borderRadius: surface.radius,
              shadowColor: surface.shadowColor,
              shadowOffset: surface.shadowOffset,
              shadowOpacity: surface.shadowOpacity,
              shadowRadius: surface.shadowRadius,
            },
          ]}
        >
          <Text
            allowFontScaling={false}
            style={{
              fontFamily: f.mono,
              fontSize: 11,
              letterSpacing: 1.6,
              color: c.fgSubtle,
              textTransform: 'uppercase',
            }}
          >
            ⌕
          </Text>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t('dict.search')}
            placeholderTextColor={c.fgSubtle}
            style={[
              styles.searchInput,
              { color: c.fg, fontFamily: f.ui, fontStyle: query ? 'normal' : 'italic' },
            ]}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          {query.length > 0 ? (
            <Pressable onPress={() => setQuery('')} hitSlop={10}>
              <Text style={{ color: c.fgMuted, fontSize: 16, fontFamily: f.display }}>✕</Text>
            </Pressable>
          ) : (
            <View
              style={{
                borderColor: c.fg,
                borderWidth: 1,
                paddingHorizontal: 7,
                paddingVertical: 2,
              }}
            >
              <Text
                allowFontScaling={false}
                style={{
                  fontFamily: f.mono,
                  fontSize: 9,
                  letterSpacing: 1.6,
                  color: c.fg,
                }}
              >
                JA / EN
              </Text>
            </View>
          )}
        </View>

        {errorBanner && (
          <Text
            allowFontScaling={false}
            style={{
              color: c.error,
              fontFamily: f.mono,
              fontSize: 11,
              letterSpacing: 1.4,
              marginTop: spacing.sm,
              textTransform: 'uppercase',
            }}
          >
            {errorBanner}
          </Text>
        )}
      </View>

      {/* ── Results ───────────────────────────────────────────────────── */}
      <View style={[styles.resultsWrap, { paddingHorizontal: SCREEN_PADDING }]}>
        {trimmed === '' && (
          <EmptyState
            kanji="索"
            label={t('dict.empty')}
            sub="Tap a kanji, kana, or English term."
          />
        )}

        {searchState.kind === 'loading' && (
          <View style={styles.centered}>
            <ActivityIndicator color={c.fg} />
          </View>
        )}

        {searchState.kind === 'error' && (
          <View style={styles.centered}>
            <Text
              allowFontScaling={false}
              style={{
                color: c.error,
                fontFamily: f.mono,
                fontSize: 11,
                letterSpacing: 1.4,
                textTransform: 'uppercase',
              }}
            >
              {searchState.message}
            </Text>
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
  const f = useFonts();
  const surface = useShape().surface;
  const words = collectWords(response);

  if (words.length === 0) {
    return (
      <View style={styles.centered}>
        <Text
          allowFontScaling={false}
          style={{
            color: c.fgMuted,
            fontFamily: f.ui,
            fontStyle: 'italic',
            fontSize: 14,
          }}
        >
          No results for “{query}”
        </Text>
      </View>
    );
  }

  return (
    <>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          marginTop: 18,
          marginBottom: 10,
        }}
      >
        <Text
          allowFontScaling={false}
          style={{
            fontFamily: f.mono,
            fontSize: 10,
            letterSpacing: 2.2,
            color: c.accent,
            textTransform: 'uppercase',
          }}
        >
          {String(words.length).padStart(2, '0')} · Results
        </Text>
        <View style={{ flex: 1, height: 1, backgroundColor: c.fg, opacity: 0.3 }} />
      </View>
      <View
        style={{
          backgroundColor: c.bgElev,
          borderColor: surface.borderColor,
          borderWidth: surface.borderWidth,
          borderRadius: surface.radius,
          shadowColor: surface.shadowColor,
          shadowOffset: surface.shadowOffset,
          shadowOpacity: surface.shadowOpacity,
          shadowRadius: surface.shadowRadius,
          flex: 1,
          minHeight: 0,
        }}
      >
        <FlatList
          data={words}
          keyExtractor={(w) => String(w.id)}
          renderItem={({ item, index }) => (
            <ResultRow
              word={item}
              query={query}
              index={index}
              onPress={() => onPick(item.id)}
            />
          )}
          ItemSeparatorComponent={() => (
            <View
              style={{
                marginHorizontal: 14,
                borderTopColor: c.fgSubtle,
                borderTopWidth: 1,
                borderStyle: 'dashed',
              }}
            />
          )}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingVertical: 6 }}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </>
  );
}

function ResultRow({
  word,
  query,
  index,
  onPress,
}: {
  word: WordResult;
  query: string;
  index: number;
  onPress: () => void;
}) {
  const c = useColors();
  const f = useFonts();
  const headword = word.kanji[0] ?? word.readings[0] ?? '';
  const reading = word.readings[0] ?? '';
  const gloss = word.meanings.find((m) => m.lang === 'eng' || m.lang === 'en')?.meaning ?? '';

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.resultRow,
        { backgroundColor: pressed ? c.bgSunken : 'transparent' },
      ]}
    >
      {/* Numeral column */}
      <Text
        allowFontScaling={false}
        style={{
          fontFamily: f.mono,
          fontSize: 11,
          letterSpacing: 1.4,
          color: c.fgSubtle,
          width: 24,
          paddingTop: 4,
        }}
      >
        {String(index + 1).padStart(2, '0')}
      </Text>
      {/* Body */}
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={styles.resultHeadRow}>
          <Text
            allowFontScaling={false}
            numberOfLines={1}
            style={{
              fontFamily: f.jp,
              fontSize: 22,
              fontWeight: '600',
              color: c.fg,
              letterSpacing: 0.5,
            }}
          >
            {highlight(headword, query, c.accent)}
          </Text>
          {reading && reading !== headword && (
            <Text
              allowFontScaling={false}
              numberOfLines={1}
              style={{
                fontFamily: f.jp,
                fontSize: 14,
                color: c.accent,
              }}
            >
              {highlight(reading, query, c.accent)}
            </Text>
          )}
          {word.jlpt_level != null && <JlptChip level={word.jlpt_level} compact />}
        </View>
        {gloss && (
          <Text
            allowFontScaling={false}
            numberOfLines={2}
            style={{
              fontFamily: f.ui,
              fontStyle: 'italic',
              fontSize: 13,
              color: c.fgMuted,
              marginTop: 3,
              lineHeight: 18,
            }}
          >
            {gloss}
          </Text>
        )}
      </View>
      {/* Chevron */}
      <Text
        allowFontScaling={false}
        style={{ fontFamily: f.display, fontSize: 18, color: c.fgSubtle, paddingTop: 2 }}
      >
        ›
      </Text>
    </Pressable>
  );
}

function collectWords(res: SearchResponse): WordResult[] {
  if ('words' in res) return res.words;
  return [];
}

function highlight(text: string, query: string, accent: string): React.ReactNode {
  if (!query) return text;
  const idx = text.indexOf(query);
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <Text style={{ color: accent }}>{text.slice(idx, idx + query.length)}</Text>
      {text.slice(idx + query.length)}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Detail view
// ─────────────────────────────────────────────────────────────────────────────

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
  const f = useFonts();
  const t = useT();

  return (
    <View style={styles.flex}>
      {/* Mono-cap back button */}
      <View style={{ paddingHorizontal: SCREEN_PADDING, paddingTop: spacing.md, paddingBottom: 6 }}>
        <Pressable onPress={onBack} hitSlop={12}>
          <Text
            allowFontScaling={false}
            style={{
              fontFamily: f.mono,
              fontSize: 11,
              letterSpacing: 1.6,
              color: c.fgMuted,
              textTransform: 'uppercase',
            }}
          >
            « {t('common.back')}
          </Text>
        </Pressable>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: SCREEN_PADDING, paddingBottom: 28 }}
        showsVerticalScrollIndicator={false}
      >
        <DictEntry
          word={details.word}
          kanjis={details.kanjis}
          onKanjiPress={onKanjiPress}
        />
      </ScrollView>

      <View
        style={{
          borderTopColor: c.fg,
          borderTopWidth: 2,
          paddingHorizontal: SCREEN_PADDING,
          paddingVertical: spacing.md,
          backgroundColor: c.bg,
        }}
      >
        <Button label={t('dict.addFlashcard')} onPress={onAddFlashcard} full />
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Empty state
// ─────────────────────────────────────────────────────────────────────────────

function EmptyState({
  kanji,
  label,
  sub,
}: {
  kanji: string;
  label: string;
  sub: string;
}) {
  const c = useColors();
  const f = useFonts();
  return (
    <View style={styles.emptyWrap}>
      <View
        style={{
          width: 72,
          height: 72,
          borderColor: c.fg,
          borderWidth: 2,
          alignItems: 'center',
          justifyContent: 'center',
          transform: [{ rotate: '-4deg' }],
        }}
      >
        <Text
          allowFontScaling={false}
          style={{
            fontFamily: f.jp,
            fontSize: 40,
            fontWeight: '700',
            color: c.fgSubtle,
            lineHeight: 44,
          }}
        >
          {kanji}
        </Text>
      </View>
      <Text
        allowFontScaling={false}
        style={{
          color: c.fgMuted,
          fontFamily: f.display,
          fontSize: 18,
          fontStyle: 'italic',
          marginTop: 18,
          textAlign: 'center',
        }}
      >
        {label}
      </Text>
      <Text
        allowFontScaling={false}
        style={{
          color: c.accent,
          fontFamily: f.mono,
          fontSize: 10,
          letterSpacing: 2.2,
          marginTop: 6,
          textTransform: 'uppercase',
        }}
      >
        {sub}
      </Text>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  flex: { flex: 1 },
  masthead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingTop: spacing.lg,
    paddingHorizontal: SCREEN_PADDING,
    paddingBottom: spacing.lg,
    gap: 12,
  },
  searchField: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
  },
  searchInput: { flex: 1, fontSize: 15, padding: 0 },
  resultsWrap: { flex: 1, paddingTop: 0 },
  resultRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 10,
    alignItems: 'flex-start',
  },
  resultHeadRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 10,
    flexWrap: 'wrap',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
  },
});

import { useState } from 'react';
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
import Feather from '@expo/vector-icons/Feather';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { useColors } from '@/theme/ThemeContext';
import { useT } from '@/lib/i18n/I18nContext';
import { fontFamily, fontSize, spacing } from '@/theme/tokens';
import { fetchWordDetails } from '../utils/dictApi';
import { useDictionarySearch } from '../hooks/useDictionarySearch';
import type { SearchResponse, WordDetails, WordResult } from '../types';
import { DictEntry as DefaultDictEntry } from './DictEntry';
import { DictResultRow } from './DictResultRow';
import { useThemedComponent } from '@/themes/useThemedComponent';

type Props = {
  visible: boolean;
  term: string;
  onDismiss: () => void;
  onAddFlashcard: (details: WordDetails) => void;
};

// Two-page drawer. Opens on the search view (input prefilled with the term
// the reader selected, results list already populated). Tapping a result
// pushes the entry detail view; a back affordance returns to the list. The
// input stays editable on the search view so the user can refine the query.
export function DictDrawer({ visible, term, onDismiss, onAddFlashcard }: Props) {
  return (
    <BottomSheet visible={visible} onDismiss={onDismiss} heightRatio={0.65}>
      {/* Keyed on `term` so re-opening with a different selection remounts
          the inner stack — query, stage, and search results all reseed
          cleanly without per-prop reset effects. */}
      <DictDrawerInner key={term || '__empty__'} term={term} onAddFlashcard={onAddFlashcard} />
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
}: {
  term: string;
  onAddFlashcard: (details: WordDetails) => void;
}) {
  const c = useColors();
  const t = useT();
  const DictEntry = useThemedComponent('DictEntry', DefaultDictEntry);

  const [query, setQuery] = useState(term);
  const [stage, setStage] = useState<Stage>({ kind: 'search' });
  const [detailErr, setDetailErr] = useState<string | null>(null);

  const searchState = useDictionarySearch(query);
  const words = searchState.kind === 'results' ? collectWords(searchState.response) : [];

  const openDetail = (id: number) => {
    setDetailErr(null);
    setStage({ kind: 'detailLoading' });
    const controller = new AbortController();
    fetchWordDetails(id, controller.signal)
      .then((details) => setStage({ kind: 'detail', details }))
      .catch((err) => {
        if (controller.signal.aborted) return;
        setDetailErr(err instanceof Error ? err.message : t('common.error'));
        setStage({ kind: 'search' });
      });
  };

  const backToSearch = () => {
    setDetailErr(null);
    setStage({ kind: 'search' });
  };

  if (stage.kind === 'detail') {
    return (
      <View style={styles.flex}>
        <View style={styles.detailHeader}>
          <Pressable onPress={backToSearch} hitSlop={12} style={styles.backRow}>
            <Feather name="chevron-left" size={20} color={c.fg} />
            <Text style={[styles.backLabel, { color: c.fgMuted, fontFamily: fontFamily.ui }]}>
              Results
            </Text>
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={styles.detailScroll}
          showsVerticalScrollIndicator={false}
        >
          <DictEntry
            word={stage.details.word}
            kanjis={stage.details.kanjis}
            sentences={stage.details.sentences}
          />
        </ScrollView>

        <View style={[styles.footer, { borderTopColor: c.border }]}>
          <Button
            label={t('dict.addFlashcard')}
            onPress={() => onAddFlashcard(stage.details)}
            full
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <View style={styles.searchHeader}>
        <View
          style={[
            styles.searchField,
            { backgroundColor: '#FFFFFF', borderColor: c.border },
          ]}
        >
          <Feather name="search" size={16} color={c.fgSubtle} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="辞書を引く…"
            placeholderTextColor={c.fgSubtle}
            style={[styles.searchInput, { color: c.fg, fontFamily: fontFamily.jp }]}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery('')} hitSlop={10}>
              <Feather name="x" size={16} color={c.fgMuted} />
            </Pressable>
          )}
        </View>
      </View>

      {detailErr && (
        <Text style={[styles.inlineError, { color: c.error }]}>{detailErr}</Text>
      )}

      {stage.kind === 'detailLoading' ? (
        <View style={styles.centered}>
          <ActivityIndicator color={c.fg} />
        </View>
      ) : searchState.kind === 'loading' ? (
        <View style={styles.centered}>
          <ActivityIndicator color={c.fg} />
        </View>
      ) : searchState.kind === 'error' ? (
        <Text style={[styles.bodyError, { color: c.error }]}>{searchState.message}</Text>
      ) : query.trim() === '' ? (
        <Text style={[styles.bodyHint, { color: c.fgMuted }]}>
          Type to search the dictionary.
        </Text>
      ) : words.length === 0 && searchState.kind === 'results' ? (
        <Text style={[styles.bodyHint, { color: c.fgMuted }]}>
          No entry for &ldquo;{query}&rdquo;.
        </Text>
      ) : (
        <FlatList
          data={words}
          keyExtractor={(w) => String(w.id)}
          contentContainerStyle={styles.list}
          renderItem={({ item, index }) => (
            <DictResultRow
              word={item}
              index={index}
              active={index === 0}
              query={query}
              onPress={() => openDetail(item.id)}
            />
          )}
          keyboardShouldPersistTaps="handled"
        />
      )}
    </View>
  );
}

function collectWords(res: SearchResponse): WordResult[] {
  if ('words' in res) return res.words;
  return [];
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  searchHeader: {
    paddingHorizontal: 22,
    paddingTop: 6,
    paddingBottom: 12,
  },
  searchField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    padding: 0,
  },
  list: { paddingHorizontal: 22, paddingBottom: 24 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  bodyHint: { textAlign: 'center', padding: spacing.lg, fontSize: fontSize.sm },
  bodyError: { textAlign: 'center', padding: spacing.lg, fontSize: fontSize.sm },
  inlineError: { paddingHorizontal: 22, paddingBottom: 6, fontSize: fontSize.sm },
  detailHeader: { paddingHorizontal: 22, paddingTop: 6, paddingBottom: 6 },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  backLabel: { fontSize: fontSize.sm },
  detailScroll: { paddingHorizontal: 22, paddingBottom: 24 },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
  },
});

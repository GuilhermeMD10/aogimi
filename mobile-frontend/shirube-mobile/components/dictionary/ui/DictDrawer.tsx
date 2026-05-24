import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { useColors } from '@/theme/ThemeContext';
import { useT } from '@/lib/i18n/I18nContext';
import { fontFamily, fontSize, spacing } from '@/theme/tokens';
import { queryDictionary, fetchWordDetails } from '../utils/dictApi';
import type { SearchResponse, WordDetails } from '../types';
import { DictEntry as DefaultDictEntry } from './DictEntry';
import { useThemedComponent } from '@/themes/useThemedComponent';

type Props = {
  visible: boolean;
  term: string;
  onDismiss: () => void;
  onAddFlashcard: (details: WordDetails) => void;
};

type DictState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'empty' }
  | { kind: 'entry'; details: WordDetails }
  | { kind: 'error'; message: string };

export function DictDrawer({ visible, term, onDismiss, onAddFlashcard }: Props) {
  const c = useColors();
  const t = useT();
  const DictEntry = useThemedComponent('DictEntry', DefaultDictEntry);
  const [state, setState] = useState<DictState>({ kind: 'idle' });

  useEffect(() => {
    if (!visible || !term) return;
    const controller = new AbortController();
    setState({ kind: 'loading' });
    (async () => {
      try {
        const res = await queryDictionary(term, controller.signal);
        const firstId = pickFirstWordId(res);
        if (firstId == null) {
          setState({ kind: 'empty' });
          return;
        }
        const details = await fetchWordDetails(firstId, controller.signal);
        setState({ kind: 'entry', details });
      } catch (err) {
        if (controller.signal.aborted) return;
        setState({
          kind: 'error',
          message: err instanceof Error ? err.message : t('common.error'),
        });
      }
    })();
    return () => controller.abort();
  }, [visible, term, t]);

  return (
    <BottomSheet visible={visible} onDismiss={onDismiss} heightRatio={0.65}>
      <View style={styles.header}>
        <Text style={[styles.term, { color: c.fg }]} numberOfLines={1}>
          {term}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {state.kind === 'loading' && (
          <View style={styles.centered}>
            <ActivityIndicator color={c.fg} />
          </View>
        )}

        {state.kind === 'empty' && (
          <View style={styles.centered}>
            <Text style={{ color: c.fgMuted, fontSize: fontSize.sm }}>
              No entry for “{term}”
            </Text>
          </View>
        )}

        {state.kind === 'error' && (
          <View style={styles.centered}>
            <Text style={{ color: c.error, fontSize: fontSize.sm }}>{state.message}</Text>
          </View>
        )}

        {state.kind === 'entry' && (
          <DictEntry
            word={state.details.word}
            kanjis={state.details.kanjis}
            sentences={state.details.sentences}
          />
        )}
      </ScrollView>

      {state.kind === 'entry' && (
        <View style={[styles.footer, { borderTopColor: c.border }]}>
          <Button
            label={t('dict.addFlashcard')}
            onPress={() => {
              if (state.kind !== 'entry') return;
              onAddFlashcard(state.details);
            }}
            full
          />
        </View>
      )}
    </BottomSheet>
  );
}

function pickFirstWordId(res: SearchResponse): number | null {
  if ('words' in res && res.words.length > 0) return res.words[0]!.id;
  return null;
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 22,
    paddingTop: 6,
    paddingBottom: 10,
  },
  term: { fontFamily: fontFamily.jp, fontSize: 24, fontWeight: '500' },
  scroll: {
    paddingHorizontal: 22,
    paddingBottom: 24,
    minHeight: 100,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
  },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
  },
});

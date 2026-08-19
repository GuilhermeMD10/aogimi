import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { useT } from '@/lib/i18n/I18nContext';
import { usePalette } from '@/theme/ThemeContext';
import { fontFamily, fontSize, radius, spacing, type Palette } from '@/theme/tokens';
import type { WordDetails } from '../types';
import { isEnglish } from '../lib/headword';
import { posLabel } from '../lib/posLabel';
import { SectionHeading } from './SectionHeading';
import { EntryHeader } from './EntryHeader';
import { KanjiBreakdownCard } from './KanjiBreakdownCard';
import { ExampleBlock } from './ExampleBlock';

/** Meanings shown before the list is cut. The entry is a reference surface, so
 *  this is generous; the result card shows three. */
const MAX_MEANINGS = 12;

/**
 * A word entry — the tab's detail frame and the reader drawer's detail page,
 * one component at two scales.
 *
 * `compact` is the drawer's step-down (`scale="compact"` on the web): smaller
 * headword, tighter blocks, one example. It owns **no** width, fill, edge,
 * scroll or padding — the surface around it supplies the box, which is what
 * lets a 65%-height sheet and a full page share this file.
 */
export function EntryView({
  details,
  query,
  compact = false,
  onAddToDeck,
  onKanjiPress,
}: {
  details: WordDetails;
  query?: string;
  compact?: boolean;
  onAddToDeck: () => void;
  /** Starts a fresh search for that character. Omitted where there is no
   *  search stack to push onto. */
  onKanjiPress?: (literal: string) => void;
}) {
  const t = useT();
  const p = usePalette();
  const styles = useStyles(p);

  const { word, kanjis, sentences } = details;
  const meanings = word.meanings.filter((m) => isEnglish(m.lang)).slice(0, MAX_MEANINGS);
  const primaryPos = posLabel(word.meanings[0]?.pos);
  // The drawer is a 65% sheet over the reader — five sentences there would bury
  // the meanings the user opened it for.
  const examples = compact ? sentences.slice(0, 1) : sentences;

  return (
    <View style={styles.root}>
      <EntryHeader word={word} query={query} compact={compact} />

      <Pressable
        onPress={onAddToDeck}
        accessibilityRole="button"
        style={[styles.addButton, compact && styles.addButtonCompact]}
      >
        <Feather name="plus" size={16} color={p.btnInk} />
        <Text style={styles.addLabel}>{t('dict.addToDeck')}</Text>
      </Pressable>

      {meanings.length > 0 && (
        <View style={styles.block}>
          <SectionHeading label={t('dict.meanings')} gloss="意味" />
          {meanings.map((m, i) => {
            const rowPos = posLabel(m.pos);
            return (
              <View key={i} style={styles.meaningRow}>
                <Text style={styles.meaningNum}>{i + 1}</Text>
                <View style={styles.meaningBody}>
                  <Text style={styles.meaningText}>{m.meaning}</Text>
                  {/* Only when this sense's part of speech differs from the
                      entry's — otherwise it repeats the header's chip on
                      every line. */}
                  {rowPos !== null && rowPos !== primaryPos && (
                    <Text style={styles.meaningPos}>{rowPos}</Text>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      )}

      {kanjis.length > 0 && (
        <View style={styles.block}>
          <SectionHeading label={t('dict.kanjiInWord')} gloss="漢字" />
          <View style={styles.kanjiStack}>
            {kanjis.map((k) => (
              <KanjiBreakdownCard
                key={k.literal}
                kanji={k}
                compact={compact}
                onPress={onKanjiPress ? () => onKanjiPress(k.literal) : undefined}
              />
            ))}
          </View>
        </View>
      )}

      {examples.length > 0 && (
        <View style={styles.block}>
          <SectionHeading label={t('dict.examples')} gloss="例文" />
          {examples.map((s, i) => (
            <ExampleBlock key={s.id} sentence={s} divider={i > 0} compact={compact} />
          ))}
        </View>
      )}
    </View>
  );
}

function useStyles(p: Palette) {
  return useMemo(
    () =>
      StyleSheet.create({
        root: { gap: spacing.lg },

        addButton: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: spacing.sm + 1,
          height: 50,
          borderRadius: radius.md,
          backgroundColor: p.btn,
        },
        // An inline button rather than a floating action button: a FAB has to
        // be positioned above the dock by hand and covers the last line of the
        // entry; an inline button sits in the flow and needs neither.
        addButtonCompact: { height: 44 },
        addLabel: {
          fontFamily: fontFamily.ui,
          fontSize: fontSize.sm + 1,
          fontWeight: '700',
          color: p.btnInk,
        },

        block: { gap: spacing.xs },

        meaningRow: {
          flexDirection: 'row',
          gap: spacing.md,
          paddingVertical: spacing.md - 1,
          borderTopWidth: 1,
          borderTopColor: p.paperBd,
        },
        meaningNum: {
          fontFamily: fontFamily.mono,
          fontSize: fontSize.xs,
          color: p.accent,
          minWidth: 12,
          paddingTop: 2,
        },
        meaningBody: { flex: 1, gap: 2 },
        meaningText: {
          fontFamily: fontFamily.ui,
          fontSize: fontSize.sm + 1,
          lineHeight: 21,
          color: p.ink,
        },
        meaningPos: {
          fontFamily: fontFamily.mono,
          fontSize: fontSize.xs - 2,
          letterSpacing: 1,
          textTransform: 'uppercase',
          color: p.muted,
        },

        kanjiStack: { gap: spacing.sm, marginTop: spacing.sm },
      }),
    [p],
  );
}

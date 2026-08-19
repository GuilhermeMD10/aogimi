import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { JlptChip } from '@/shared/components/JlptChip';
import { usePalette } from '@/theme/ThemeContext';
import { fontFamily, fontSize, radius, spacing, type Palette } from '@/theme/tokens';
import type { KanjiInfo, NameResult } from '../types';
import { MetaChip } from './MetaChip';
import { AddButton } from './AddButton';

/**
 * The results list's second card shape — one glyph on the left, its data on the
 * right. Kanji entries and name entries both use it; the handoff draws neither,
 * because it only ever shows a word search.
 *
 * **These results were being thrown away.** `searchLocal` returns
 * `{ kanji, words, names }` for a single-kanji query and
 * `{ words, names, kanjis }` for a kana one, and the old list rendered `words`
 * alone — so searching 辞 showed every word containing it and never the
 * character itself. This is the missing half.
 *
 * It is deliberately a *variation* of `ResultCard` rather than a second design:
 * same padding, radius, chip row and add affordance, with the headword moved
 * into a left column so a 34px glyph does not push the gloss off the row. It
 * also echoes the entry screen's kanji card, which is the same idea one level
 * down.
 */
function CharResultCard({
  glyph,
  sub,
  gloss,
  chips,
  compact = false,
  onPress,
  add,
}: {
  glyph: string;
  /** Readings line, under the glyph's data — Japanese, so it takes the `jp` face. */
  sub?: string | null;
  gloss?: string | null;
  chips?: React.ReactNode;
  compact?: boolean;
  onPress?: () => void;
  /** Omitted entirely for names — see `NameResultCard`. */
  add?: { label: string; onPress: () => void };
}) {
  const p = usePalette();
  const styles = useStyles(p);

  const content = (
    <>
      <Text style={[styles.glyph, compact && styles.glyphCompact]} numberOfLines={1}>
        {glyph}
      </Text>

      <View style={styles.body}>
        {gloss != null && gloss !== '' && (
          <Text style={styles.gloss} numberOfLines={compact ? 1 : 2}>
            {gloss}
          </Text>
        )}
        {sub != null && sub !== '' && (
          <Text style={styles.sub} numberOfLines={1}>
            {sub}
          </Text>
        )}
        {chips !== undefined && <View style={styles.chips}>{chips}</View>}
      </View>

      {add !== undefined && (
        <AddButton
          onPress={add.onPress}
          accessibilityLabel={add.label}
          size={compact ? 30 : 32}
        />
      )}
    </>
  );

  if (onPress === undefined) {
    return <View style={[styles.card, compact && styles.cardCompact]}>{content}</View>;
  }
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={[styles.card, compact && styles.cardCompact]}
    >
      {content}
    </Pressable>
  );
}

/**
 * A kanji entry. Carries the add affordance — `kanjiCardDraft` exists, and a
 * character is a perfectly good card.
 */
export function KanjiResultCard({
  kanji,
  compact,
  addLabel,
  onPress,
  onAdd,
}: {
  kanji: KanjiInfo;
  compact?: boolean;
  addLabel: string;
  onPress?: () => void;
  onAdd: () => void;
}) {
  const readings = [
    kanji.on_readings.length > 0 ? kanji.on_readings.join('、') : null,
    kanji.kun_readings.length > 0 ? kanji.kun_readings.join('、') : null,
  ]
    .filter((v): v is string => v !== null)
    .join('  ·  ');

  return (
    <CharResultCard
      glyph={kanji.literal}
      gloss={kanji.meanings.slice(0, 4).join(', ')}
      sub={readings}
      compact={compact}
      onPress={onPress}
      add={{ label: addLabel, onPress: onAdd }}
      chips={
        <>
          {kanji.jlpt_level != null && <JlptChip level={kanji.jlpt_level} compact />}
          {kanji.grade != null && <MetaChip label={`grade ${kanji.grade}`} />}
          {kanji.stroke_count != null && <MetaChip label={`${kanji.stroke_count} strokes`} />}
        </>
      }
    />
  );
}

/**
 * A JMnedict name. Same card, **no add affordance**: `cardDraft.ts` builds word
 * and kanji drafts only, and a name has no gloss list or JLPT tier to fill one
 * with. Writing `nameCardDraft` would be a feature, not part of this redesign.
 *
 * Not pressable either — there is no name detail screen, and every field the
 * entry would show is already on this card.
 */
export function NameResultCard({ name, compact }: { name: NameResult; compact?: boolean }) {
  return (
    <CharResultCard
      glyph={name.kanji ?? name.kana}
      // Only when the glyph is the kanji form; otherwise this would repeat it.
      sub={name.kanji !== null ? name.kana : null}
      gloss={name.translations.join('; ')}
      compact={compact}
      chips={name.name_type.map((type) => (
        <MetaChip key={type} label={type} />
      ))}
    />
  );
}

function useStyles(p: Palette) {
  return useMemo(
    () =>
      StyleSheet.create({
        card: {
          flexDirection: 'row',
          alignItems: 'flex-start',
          gap: spacing.md,
          padding: spacing.md + 1,
          borderRadius: radius.md,
          backgroundColor: p.paper,
          borderWidth: 1,
          borderColor: p.paperBd,
        },
        cardCompact: { padding: spacing.sm + 2, gap: spacing.sm + 2 },

        glyph: {
          fontFamily: fontFamily.jp,
          fontSize: 34,
          lineHeight: 40,
          color: p.ink,
          minWidth: 40,
        },
        glyphCompact: { fontSize: 28, lineHeight: 34, minWidth: 32 },

        body: { flex: 1, minWidth: 0, paddingTop: 2 },
        gloss: {
          fontFamily: fontFamily.ui,
          fontSize: fontSize.sm - 1,
          lineHeight: 17,
          color: p.soft,
        },
        sub: {
          fontFamily: fontFamily.jp,
          fontSize: fontSize.xs,
          color: p.muted,
          marginTop: 3,
        },
        chips: {
          flexDirection: 'row',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 6,
          marginTop: spacing.sm,
        },
      }),
    [p],
  );
}

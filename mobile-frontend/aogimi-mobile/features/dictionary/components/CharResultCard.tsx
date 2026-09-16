import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Glass } from '@/shared/components/Glass';
import { Touchable } from '@/shared/components/Touchable';
import { JlptChip } from '@/shared/components/JlptChip';
import { usePalette } from '@/theme/ThemeContext';
import { radius, spacing, type, type Palette } from '@/theme/tokens';
import type { KanjiInfo, NameResult } from '../types';
import { MetaChip } from './MetaChip';
import { AddButton } from './AddButton';

/**
 * The results list's second row shape — one glyph on the left, its data on the
 * right. Kanji entries and name entries both use it: `searchLocal` returns
 * `{ kanji, words, names }` for a single-kanji query and `{ words, names,
 * kanjis }` for a kana one, and rendering `words` alone would mean searching 辞
 * shows every word containing it and never the character itself.
 *
 * It is deliberately a *variation* of `ResultCard` rather than a second design:
 * the same Tier 2 pane, radius, padding, chip row and add circle, with the
 * headword moved into a left column so a 34px glyph does not push the gloss
 * off the row. It also echoes the entry's kanji card, the same idea one level
 * down.
 */
function CharResultCard({
  glyph,
  sub,
  gloss,
  chips,
  onPress,
  add,
}: {
  glyph: string;
  /** Readings line, under the glyph's data — Japanese, so it takes the JP face. */
  sub?: string | null;
  gloss?: string | null;
  chips?: React.ReactNode;
  onPress?: () => void;
  /** Omitted entirely for names — see `NameResultCard`. */
  add?: { label: string; onPress: () => void };
}) {
  const p = usePalette();
  const styles = useStyles(p);

  const pane = (
    <Glass tier={2} radius={radius.control} style={styles.row}>
      <Text style={styles.glyph} numberOfLines={1}>
        {glyph}
      </Text>

      <View style={styles.body}>
        {gloss != null && gloss !== '' && (
          <Text style={styles.gloss} numberOfLines={2}>
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

      {add !== undefined && <AddButton onPress={add.onPress} accessibilityLabel={add.label} />}
    </Glass>
  );

  // A row without `onPress` is a display row — wrapping it in a pressable
  // would announce it as a button to a screen reader.
  if (onPress === undefined) return pane;
  return (
    <Touchable onPress={onPress} accessibilityRole="button" minTarget={false}>
      {pane}
    </Touchable>
  );
}

/**
 * A kanji entry. Carries the add affordance — `kanjiCardDraft` exists, and a
 * character is a perfectly good card.
 */
export function KanjiResultCard({
  kanji,
  addLabel,
  onPress,
  onAdd,
}: {
  kanji: KanjiInfo;
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
 * A JMnedict name. Same row, **no add affordance**: `cardDraft.ts` builds word
 * and kanji drafts only, and a name has no gloss list or JLPT tier to fill one
 * with. Writing `nameCardDraft` would be a feature, not part of this redesign.
 *
 * Not pressable either — there is no name detail screen, and every field the
 * entry would show is already on this row.
 */
export function NameResultCard({ name }: { name: NameResult }) {
  return (
    <CharResultCard
      glyph={name.kanji ?? name.kana}
      // Only when the glyph is the kanji form; otherwise this would repeat it.
      sub={name.kanji !== null ? name.kana : null}
      gloss={name.translations.join('; ')}
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
        row: {
          flexDirection: 'row',
          alignItems: 'flex-start',
          gap: spacing.md,
          paddingVertical: spacing.md + 2,
          paddingHorizontal: spacing.lg,
        },
        /** One character, large — the Medium JP cut `displayKanji` names, a
         *  step under the entry's own kanji card. */
        glyph: {
          fontFamily: type.displayKanjiMobile.fontFamily,
          fontSize: 34,
          fontWeight: '500',
          lineHeight: 40,
          color: p.ink,
          minWidth: 40,
        },
        body: { flex: 1, minWidth: 0, paddingTop: 2, gap: spacing.xs },
        gloss: { ...type.bodySm, color: p.ink },
        sub: {
          fontFamily: type.titleReading.fontFamily,
          fontSize: 13,
          lineHeight: 18,
          color: p.muted,
        },
        chips: {
          flexDirection: 'row',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 6,
          marginTop: 2,
        },
      }),
    [p],
  );
}

import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { JlptChip, PitchAccentDiagram } from '@/shared/components';
import { usePalette, radius, spacing, type, type Palette } from '@/theme';
import type { WordResult } from '../types';
import { preferredHeadword, posLabel } from '../lib';
import { MetaChip } from './MetaChip';

/**
 * The entry's title block: headword, reading, pitch, and the chip row.
 *
 * **The pitch diagram is real data, not an ornament** — `pitchAccents` comes
 * from Kanjium and `PitchAccentDiagram` renders the actual pattern, under the
 * reading (it is as wide as the word is long, so it cannot sit in a fixed box
 * beside it). Kanjium does not span all of JMdict, so it renders nothing for a
 * good fraction of entries and the block simply closes up.
 *
 * **No audio.** There is no audio data anywhere in the app, so the affordance
 * is absent rather than stubbed.
 */
export function EntryHeader({
  word,
  query,
  compact = false,
}: {
  word: WordResult;
  query?: string;
  compact?: boolean;
}) {
  const p = usePalette();
  const styles = useStyles(p);

  const headword = preferredHeadword(word, query);
  const primaryReading = word.readings[0];
  const reading = primaryReading?.form ?? '';
  const pos = posLabel(word.meanings[0]?.pos);
  // Only the graded characters: KANJIDIC leaves grade null for the ~4,000 kanji
  // outside the jōyō/jinmeiyō lists, and an empty chip says nothing.
  const graded = (word.char_grades ?? []).filter(
    (cg): cg is { char: string; grade: number } => cg.grade != null,
  );

  return (
    <View>
      <Text style={[styles.headword, compact && styles.headwordCompact]} numberOfLines={2}>
        {headword}
      </Text>

      {reading !== '' && reading !== headword && (
        <Text style={[styles.reading, compact && styles.readingCompact]} numberOfLines={1}>
          {reading}
        </Text>
      )}

      {primaryReading?.pitchAccents != null && (
        <View style={styles.pitch}>
          <PitchAccentDiagram
            reading={primaryReading.form}
            pitchAccents={primaryReading.pitchAccents}
            size={compact ? 'sm' : 'md'}
          />
        </View>
      )}

      <View style={styles.chips}>
        {word.jlpt_level != null && <JlptChip level={word.jlpt_level} />}
        {pos !== null && <MetaChip label={pos} />}
        {word.is_common && <MetaChip label="common" />}
        {graded.map(({ char, grade }) => (
          <View key={char} style={styles.gradeChip}>
            <Text style={styles.gradeGlyph}>{char}</Text>
            <Text style={styles.gradeLabel}>G{grade}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function useStyles(p: Palette) {
  return useMemo(
    () =>
      StyleSheet.create({
        /** The largest type in the app — DESIGN.md's display kanji, and its
         *  phone size in the sheet. */
        headword: { ...type.displayKanji, color: p.ink },
        headwordCompact: { ...type.displayKanjiMobile },
        reading: { ...type.titleReading, color: p.muted, marginTop: spacing.xs },
        readingCompact: { fontSize: 14, lineHeight: 20 },
        pitch: { marginTop: spacing.sm },

        chips: {
          flexDirection: 'row',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 6,
          marginTop: spacing.md,
        },
        /** The kanji-grade chip is the one tag carrying a glyph — `MetaChip`'s
         *  tile with the character set beside its label. */
        gradeChip: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.xs,
          paddingHorizontal: 6,
          paddingVertical: 2,
          borderRadius: radius.chip,
          backgroundColor: p.glassStandard,
        },
        gradeGlyph: {
          fontFamily: type.titleReading.fontFamily,
          fontSize: 12,
          lineHeight: 14,
          color: p.ink,
        },
        gradeLabel: { ...type.eyebrow, letterSpacing: 0.6, color: p.faint },
      }),
    [p],
  );
}

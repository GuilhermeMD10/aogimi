import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { JlptChip } from '@/shared/components/JlptChip';
import { PitchAccentDiagram } from '@/shared/components/PitchAccentDiagram';
import { usePalette } from '@/theme/ThemeContext';
import { fontFamily, fontSize, radius, spacing, type Palette } from '@/theme/tokens';
import type { WordResult } from '../types';
import { preferredHeadword } from '../lib/headword';
import { posLabel } from '../lib/posLabel';
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
        // 54px sits above the `fontSize` scale's `hero` (42) and is used only
        // here — the entry's headword is the largest type in the app.
        headword: {
          fontFamily: fontFamily.jp,
          fontSize: 54,
          lineHeight: 58,
          color: p.ink,
        },
        headwordCompact: { fontSize: 38, lineHeight: 44 },
        reading: {
          fontFamily: fontFamily.jp,
          fontSize: fontSize.sm,
          color: p.muted,
          marginTop: spacing.sm + 1,
        },
        readingCompact: { fontSize: fontSize.xs + 1, marginTop: spacing.xs },
        pitch: { marginTop: spacing.sm },

        chips: {
          flexDirection: 'row',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 7,
          marginTop: spacing.md,
        },
        // The kanji-grade chip is the one chip carrying a glyph, so it is a
        // small square-cornered tile rather than a pill — a pill around a
        // 13px character reads as a button.
        gradeChip: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 5,
          paddingHorizontal: 9,
          paddingVertical: 3,
          borderRadius: radius.sm + 2,
          borderWidth: 1,
          borderColor: p.paperBd,
          backgroundColor: p.paper,
        },
        gradeGlyph: {
          fontFamily: fontFamily.jp,
          fontSize: fontSize.sm,
          color: p.ink,
        },
        gradeLabel: {
          fontFamily: fontFamily.mono,
          fontSize: fontSize.xs - 2,
          letterSpacing: 0.5,
          color: p.muted,
        },
      }),
    [p],
  );
}

import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/theme/ThemeContext';
import { fontFamily, fontSize, palette, radius, spacing } from '@/theme/tokens';
import type { ExampleSentence, KanjiInfo, WordResult } from '../types';
import { JlptChip } from '@/shared/components/JlptChip';
import { PitchAccentDiagram } from '@/shared/components/PitchAccentDiagram';
import { RubyText } from '@/shared/components/RubyText';
import { preferredHeadword } from '../lib/headword';

type Props = {
  word: WordResult;
  kanjis?: KanjiInfo[];
  sentences?: ExampleSentence[];
  compact?: boolean;
  /** Active dictionary query — when supplied and the user's query exactly
   *  matches one of the word's kanji or readings, that form is shown as the
   *  headword instead of the dict's "primary" common form. */
  query?: string;
  /** When provided, each kanji card becomes pressable and fires this with
   *  the kanji's literal — the parent typically opens a fresh dictionary
   *  search for that character (drill-down / "infinite search loop"). */
  onKanjiPress?: (literal: string) => void;
};

/** Word detail. Hero band carries a giant watermark of the headword's last
 *  kanji, the headword in display weight, and chips (pos / common / JLPT)
 *  above. Meanings are numbered with mono "01/02" labels; kanji cards live
 *  in a horizontal scroller below and surface Strokes / Grade / JLPT /
 *  Radical alongside on/kun readings. paddingBottom leaves room for the
 *  parent's FAB. */
export function DictEntry({ word, kanjis = [], sentences = [], compact, query, onKanjiPress }: Props) {
  const c = useColors();
  const headword = preferredHeadword(word, query);
  const primaryReading = word.readings[0];
  const reading = primaryReading?.form ?? '';
  const altReadings = word.readings.slice(1, 4).map((r) => r.form);
  const englishMeanings = word.meanings
    .filter((m) => m.lang === 'eng' || m.lang === 'en')
    .slice(0, compact ? 3 : 12);
  const pos = englishMeanings[0]?.pos ?? null;
  const watermarkChar = [...headword].reverse().find((ch) => /[一-鿿]/.test(ch)) ?? '';

  return (
    <View style={styles.root}>
      <View style={[styles.hero, { borderColor: c.border }]}>
        {watermarkChar !== '' && (
          <Text
            accessibilityElementsHidden
            importantForAccessibility="no"
            style={[styles.watermark, { color: c.fg, fontFamily: fontFamily.jp }]}
          >
            {watermarkChar}
          </Text>
        )}
        <View style={styles.heroChips}>
          {pos && <Chip text={pos} c={c} />}
          {word.is_common && <Chip text="common" c={c} accent />}
          {word.jlpt_level != null && <JlptChip level={word.jlpt_level} />}
          {word.grade != null && <Chip text={`Grade ${word.grade}`} c={c} />}
        </View>

        <Text
          style={[styles.headword, { color: c.fg, fontFamily: fontFamily.jp }]}
          numberOfLines={2}
        >
          {headword}
        </Text>
        {reading && reading !== headword && (
          <Text
            style={[styles.reading, { color: c.fgMuted, fontFamily: fontFamily.jp }]}
            numberOfLines={1}
          >
            {reading}
          </Text>
        )}
        {primaryReading?.pitchAccents && (
          <View style={{ marginTop: 6 }}>
            <PitchAccentDiagram
              reading={primaryReading.form}
              pitchAccents={primaryReading.pitchAccents}
            />
          </View>
        )}
        {altReadings.length > 0 && (
          <Text
            style={[styles.altReadings, { color: c.fgSubtle, fontFamily: fontFamily.jp }]}
            numberOfLines={1}
          >
            {altReadings.join(' · ')}
          </Text>
        )}
      </View>

      {englishMeanings.length > 0 && (
        <View style={styles.meanings}>
          <Text style={[styles.sectionLabel, { color: c.fgSubtle, fontFamily: fontFamily.ui }]}>
            意 味 · MEANINGS
          </Text>
          {englishMeanings.map((m, i) => (
            <View key={i} style={[styles.meaningRow, { borderTopColor: i > 0 ? c.border : 'transparent' }]}>
              <Text style={[styles.meaningNum, { color: c.accent, fontFamily: fontFamily.ui }]}>
                {String(i + 1).padStart(2, '0')}
              </Text>
              <View style={styles.meaningBody}>
                <Text
                  style={[styles.meaningText, { color: c.fg, fontFamily: fontFamily.reader }]}
                >
                  {m.meaning}
                </Text>
                {m.pos && m.pos !== pos && (
                  <Text style={[styles.pos, { color: c.fgMuted, fontFamily: fontFamily.ui }]}>
                    {m.pos}
                  </Text>
                )}
              </View>
            </View>
          ))}
        </View>
      )}

      {kanjis.length > 0 && (
        <View style={styles.kanjiSection}>
          <Text style={[styles.sectionLabel, { color: c.fgSubtle, fontFamily: fontFamily.ui }]}>
            漢 字 · KANJI BREAKDOWN
          </Text>
          {onKanjiPress && (
            <Text style={[styles.kanjiHint, { color: c.fgSubtle, fontFamily: fontFamily.reader }]}>
              Tap a card to drill into that kanji.
            </Text>
          )}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.kanjiRow}
          >
            {kanjis.map((k) => (
              <KanjiCard
                key={k.literal}
                kanji={k}
                onPress={onKanjiPress ? () => onKanjiPress(k.literal) : undefined}
              />
            ))}
          </ScrollView>
        </View>
      )}

      {sentences.length > 0 && (
        <View style={styles.sentencesSection}>
          <Text style={[styles.sectionLabel, { color: c.fgSubtle, fontFamily: fontFamily.ui }]}>
            例 文 · EXAMPLES
          </Text>
          {sentences.map((s) => (
            <View
              key={s.id}
              style={[styles.sentenceCard, { backgroundColor: c.bgElev, borderColor: c.border }]}
            >
              <RubyText html={s.jaRuby} fallback={s.ja} color={c.fg} />
              <Text
                style={[styles.sentenceEn, { color: c.fgMuted, fontFamily: fontFamily.reader }]}
              >
                {s.en}
              </Text>
              {s.gradeLabel && (
                <Text
                  style={[styles.sentenceGrade, { color: c.fgSubtle, fontFamily: fontFamily.ui }]}
                >
                  {s.gradeLabel}
                </Text>
              )}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

function KanjiCard({
  kanji,
  onPress,
}: {
  kanji: KanjiInfo;
  onPress?: () => void;
}) {
  const c = useColors();
  const body = (
    <>
      <View style={styles.kanjiHeader}>
        <Text style={[styles.kanjiChar, { color: c.fg, fontFamily: fontFamily.jp }]}>
          {kanji.literal}
        </Text>
        {kanji.jlpt_level != null && <JlptChip level={kanji.jlpt_level} compact />}
      </View>

      {kanji.meanings.length > 0 && (
        <Text
          style={[styles.kanjiMeaning, { color: c.fg, fontFamily: fontFamily.reader }]}
          numberOfLines={3}
        >
          {kanji.meanings.slice(0, 4).join(', ')}
        </Text>
      )}

      <View style={styles.kanjiInfo}>
        <InfoRow label="On" value={kanji.on_readings.join('、') || '—'} jp c={c} />
        <InfoRow label="Kun" value={kanji.kun_readings.join('、') || '—'} jp c={c} />
        <InfoRow label="Strokes" value={kanji.stroke_count != null ? String(kanji.stroke_count) : '—'} c={c} />
        <InfoRow label="Grade" value={kanji.grade != null ? String(kanji.grade) : '—'} c={c} />
        <InfoRow label="Radical" value={kanji.radical != null ? String(kanji.radical) : '—'} c={c} />
      </View>
    </>
  );

  if (!onPress) {
    return (
      <View style={[styles.kanjiCard, { backgroundColor: c.bgElev, borderColor: c.border }]}>
        {body}
      </View>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Search ${kanji.literal}`}
      style={[styles.kanjiCard, { backgroundColor: c.bgElev, borderColor: c.border }]}
    >
      {body}
    </Pressable>
  );
}

function InfoRow({
  label,
  value,
  jp,
  c,
}: {
  label: string;
  value: string;
  jp?: boolean;
  c: { fgSubtle: string; fg: string };
}) {
  return (
    <View style={styles.infoRow}>
      <Text style={[styles.infoLabel, { color: c.fgSubtle, fontFamily: fontFamily.ui }]}>
        {label}
      </Text>
      <Text
        style={[
          styles.infoValue,
          { color: c.fg, fontFamily: jp ? fontFamily.jp : fontFamily.reader },
        ]}
        numberOfLines={1}
      >
        {value}
      </Text>
    </View>
  );
}

function Chip({
  text,
  c,
  accent,
}: {
  text: string;
  c: { fgMuted: string; border: string; bgElev: string; accent: string; accentFg: string };
  accent?: boolean;
}) {
  return (
    <View
      style={[
        styles.chip,
        {
          borderColor: accent ? c.accent : c.border,
          backgroundColor: accent ? c.accent : c.bgElev,
        },
      ]}
    >
      <Text
        style={[
          styles.chipText,
          // Cream, not the legacy `accentFg`: an accent chip is filled with the
          // vermilion seal, and `accentFg` resolves to the dark ink meant for
          // pale fills.
          { color: accent ? palette.accentInk : c.fgMuted, fontFamily: fontFamily.ui },
        ]}
      >
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: spacing.xl,
    paddingBottom: 120,
  },
  hero: {
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 28,
    paddingHorizontal: 24,
    overflow: 'hidden',
    position: 'relative',
    minHeight: 220,
  },
  watermark: {
    position: 'absolute',
    right: -28,
    top: -56,
    fontSize: 220,
    lineHeight: 220,
    opacity: 0.05,
    fontWeight: '600',
    pointerEvents: 'none' as never,
  },
  heroChips: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
    zIndex: 1,
  },
  chip: {
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  chipText: {
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  headword: {
    fontSize: 60,
    lineHeight: 68,
    fontWeight: '600',
    letterSpacing: -1,
    zIndex: 1,
  },
  reading: {
    fontSize: 22,
    marginTop: spacing.sm,
    zIndex: 1,
  },
  altReadings: {
    fontSize: 13,
    marginTop: 4,
    zIndex: 1,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  meanings: {},
  meaningRow: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  meaningNum: {
    fontSize: 11,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
    letterSpacing: 1,
    minWidth: 22,
    paddingTop: 4,
  },
  meaningBody: {
    flex: 1,
    gap: 2,
  },
  meaningText: {
    fontSize: fontSize.lg,
    lineHeight: 24,
  },
  pos: {
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  kanjiSection: {},
  sentencesSection: {
    gap: spacing.sm,
  },
  sentenceCard: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
    gap: 4,
  },
  sentenceEn: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  sentenceGrade: {
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginTop: 4,
  },
  kanjiHint: {
    fontSize: 12,
    marginBottom: spacing.sm,
  },
  kanjiRow: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingRight: spacing.lg,
  },
  kanjiCard: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.lg,
    width: 240,
    gap: 6,
  },
  kanjiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: 4,
  },
  kanjiChar: {
    fontSize: 56,
    lineHeight: 60,
    fontWeight: '600',
    letterSpacing: -1,
  },
  kanjiMeaning: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 4,
  },
  kanjiInfo: {
    marginTop: 4,
    gap: 2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.sm,
  },
  infoLabel: {
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    minWidth: 48,
  },
  infoValue: {
    flex: 1,
    fontSize: 12,
  },
});

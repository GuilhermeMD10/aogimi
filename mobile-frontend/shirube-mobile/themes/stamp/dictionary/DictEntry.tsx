import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useColors, useFonts, useShape } from '@/theme/ThemeContext';
import type { ExampleSentence, KanjiInfo, WordResult } from '@/components/dictionary/types';
import { Postmark } from '@/components/theme-decorations/stamp';
import { JlptChip } from '@/components/ui/JlptChip';
import { PitchAccentDiagram } from '@/components/ui/PitchAccentDiagram';
import { RubyText } from '@/components/ui/RubyText';

type Props = {
  word: WordResult;
  kanjis?: KanjiInfo[];
  sentences?: ExampleSentence[];
  compact?: boolean;
  /** When provided, each kanji card becomes pressable and fires this with
   *  the kanji's literal — the parent typically opens a fresh dictionary
   *  search for that character (drill-down). */
  onKanjiPress?: (literal: string) => void;
};

/**
 * Stamp-theme word detail entry.
 *
 * Composition (per Stamp Agent Handoff §04.03 dictionary drawer + Stamp DS
 * .dict-entry):
 *  - Headword: 44–56px serif display + reading (vermillion mono) +
 *    pos chips
 *  - Postmark decoration in the top-right corner
 *  - Definitions: vermillion serif numerals, dashed dividers, sumi-soft
 *    body text in italic
 *  - Kanji breakdown: 2-up grid of sumi-bordered cards with char + on/kun
 *    readings + meanings
 */
export function DictEntry({ word, kanjis = [], sentences = [], compact, onKanjiPress }: Props) {
  const c = useColors();
  const f = useFonts();
  const surface = useShape().surface;

  const headword = word.kanji[0] ?? word.readings[0]?.form ?? '';
  const primaryReading = word.readings[0];
  const reading = primaryReading?.form ?? '';
  const altReadings = word.readings.slice(1).map((r) => r.form);
  const englishMeanings = word.meanings
    .filter((m) => m.lang === 'eng' || m.lang === 'en')
    .slice(0, compact ? 3 : 8);
  const pos = word.meanings[0]?.pos ?? null;

  return (
    <View style={styles.root}>
      {/* Headword block ─ headword + reading + chips, with postmark anchored
          to the top-right of the whole entry. */}
      <View style={styles.headBlock}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text
            allowFontScaling={false}
            numberOfLines={1}
            style={{
              fontFamily: f.jp,
              fontSize: 56,
              fontWeight: '700',
              color: c.fg,
              letterSpacing: 1.4,
              lineHeight: 60,
            }}
          >
            {headword}
          </Text>
          {reading && reading !== headword && (
            <Text
              allowFontScaling={false}
              style={{
                fontFamily: f.jp,
                fontSize: 18,
                color: c.accent,
                marginTop: 6,
                letterSpacing: 0.5,
              }}
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
              allowFontScaling={false}
              style={{
                fontFamily: f.mono,
                fontSize: 11,
                color: c.fgSubtle,
                letterSpacing: 1.4,
                marginTop: 2,
                textTransform: 'uppercase',
              }}
            >
              {altReadings.join(' · ')}
            </Text>
          )}
          {(pos || word.is_common || word.jlpt_level != null) && (
            <View style={styles.chipRow}>
              {pos && <StampChip>{pos}</StampChip>}
              {word.is_common && <StampChip solid>COMMON</StampChip>}
              {word.jlpt_level != null && <JlptChip level={word.jlpt_level} />}
            </View>
          )}
        </View>
        <View style={{ marginLeft: 8, marginTop: 4 }}>
          <Postmark size={70} rotate={-8} />
        </View>
      </View>

      {/* Sumi rule between header and meanings */}
      <View style={{ height: 1.5, backgroundColor: c.fg, marginTop: 18, marginBottom: 18 }} />

      {/* Definitions ─ large vermillion numerals + dashed dividers */}
      {englishMeanings.length > 0 && (
        <View>
          <SectionLabel>Meanings</SectionLabel>
          <View style={styles.meaningsBlock}>
            {englishMeanings.map((m, i) => (
              <View
                key={i}
                style={[
                  styles.meaningRow,
                  i > 0 && {
                    borderTopWidth: 1,
                    borderTopColor: c.fgSubtle,
                    borderStyle: 'dashed',
                  },
                ]}
              >
                <Text
                  allowFontScaling={false}
                  style={{
                    fontFamily: f.displayBold,
                    fontWeight: '700',
                    fontSize: 26,
                    color: c.accent,
                    width: 36,
                    lineHeight: 28,
                  }}
                >
                  {String(i + 1).padStart(2, '0')}
                </Text>
                <View style={{ flex: 1 }}>
                  <Text
                    allowFontScaling={false}
                    style={{
                      fontFamily: f.ui,
                      fontSize: 15,
                      color: c.fgMuted,
                      lineHeight: 22,
                      fontStyle: 'italic',
                    }}
                  >
                    {m.meaning}
                  </Text>
                  {m.pos && (
                    <Text
                      allowFontScaling={false}
                      style={{
                        fontFamily: f.mono,
                        fontSize: 9,
                        letterSpacing: 1.8,
                        color: c.fgSubtle,
                        textTransform: 'uppercase',
                        marginTop: 4,
                      }}
                    >
                      {m.pos}
                    </Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Kanji breakdown */}
      {kanjis.length > 0 && (
        <View style={{ marginTop: 22 }}>
          <SectionLabel>Kanji</SectionLabel>
          <View style={styles.kanjiGrid}>
            {kanjis.map((k) => (
              <KanjiTile
                key={k.literal}
                kanji={k}
                onPress={onKanjiPress ? () => onKanjiPress(k.literal) : undefined}
              />
            ))}
          </View>
        </View>
      )}

      {/* Example sentences */}
      {sentences.length > 0 && (
        <View style={{ marginTop: 22, gap: 10 }}>
          <SectionLabel>Examples</SectionLabel>
          {sentences.map((s) => (
            <View
              key={s.id}
              style={[
                stampSentenceStyles.card,
                { backgroundColor: c.bgElev, borderColor: c.fg },
              ]}
            >
              <RubyText html={s.jaRuby} fallback={s.ja} color={c.fg} />
              <Text
                style={[
                  stampSentenceStyles.en,
                  { color: c.fgMuted, fontFamily: f.reader },
                ]}
              >
                {s.en}
              </Text>
              {s.gradeLabel && (
                <Text
                  style={[
                    stampSentenceStyles.grade,
                    { color: c.fgSubtle, fontFamily: f.mono },
                  ]}
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

const stampSentenceStyles = StyleSheet.create({
  card: {
    borderRadius: 4,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    gap: 4,
  },
  en: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
    fontStyle: 'italic',
  },
  grade: {
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginTop: 4,
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// Kanji tile — pressable when an `onPress` is provided. Press collapses the
// hard offset shadow + translates the tile {2,2} so it reads as "stamped in".
// ─────────────────────────────────────────────────────────────────────────────

function KanjiTile({
  kanji,
  onPress,
}: {
  kanji: KanjiInfo;
  onPress?: () => void;
}) {
  const c = useColors();
  const f = useFonts();
  const surface = useShape().surface;

  const body = (
    <>
      {/* Big char on the left, divided from data by a vertical sumi rule.
          JLPT chip pinned under the char so the level is the second-most-
          prominent thing in the kanji card. */}
      <View
        style={{
          width: 56,
          alignItems: 'center',
          justifyContent: 'center',
          borderRightColor: c.fg,
          borderRightWidth: 1,
          paddingVertical: 10,
          gap: 6,
        }}
      >
        <Text
          allowFontScaling={false}
          style={{
            fontFamily: f.jp,
            fontSize: 36,
            fontWeight: '700',
            color: c.fg,
            lineHeight: 40,
          }}
        >
          {kanji.literal}
        </Text>
        {kanji.jlpt_level != null && <JlptChip level={kanji.jlpt_level} compact />}
      </View>
      <View style={{ flex: 1, padding: 10, gap: 4, minWidth: 0 }}>
        {kanji.on_readings.length > 0 && (
          <KanjiReading label="音" value={kanji.on_readings.slice(0, 3).join('、')} />
        )}
        {kanji.kun_readings.length > 0 && (
          <KanjiReading label="訓" value={kanji.kun_readings.slice(0, 3).join('、')} />
        )}
        {kanji.meanings.length > 0 && (
          <Text
            allowFontScaling={false}
            numberOfLines={2}
            style={{
              fontFamily: f.ui,
              fontStyle: 'italic',
              fontSize: 12,
              color: c.fgSubtle,
              marginTop: 2,
              lineHeight: 16,
            }}
          >
            {kanji.meanings.slice(0, 3).join(', ')}
          </Text>
        )}
      </View>
    </>
  );

  const baseStyle = {
    backgroundColor: c.bgElev,
    borderColor: surface.borderColor,
    borderWidth: surface.borderWidth,
    borderRadius: surface.radius,
    shadowColor: surface.shadowColor,
    shadowRadius: surface.shadowRadius,
  };

  if (!onPress) {
    return (
      <View
        style={[
          styles.kanjiCard,
          baseStyle,
          {
            shadowOffset: surface.shadowOffset,
            shadowOpacity: surface.shadowOpacity,
          },
        ]}
      >
        {body}
      </View>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Search ${kanji.literal}`}
      style={({ pressed }) => [
        styles.kanjiCard,
        baseStyle,
        {
          shadowOffset: pressed ? { width: 0, height: 0 } : surface.shadowOffset,
          shadowOpacity: pressed ? 0 : surface.shadowOpacity,
          // Stable transform shape across press states — see Button.tsx.
          transform: [
            { translateX: pressed ? 2 : 0 },
            { translateY: pressed ? 2 : 0 },
          ],
        },
      ]}
    >
      {body}
    </Pressable>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Atoms
// ─────────────────────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: string }) {
  const c = useColors();
  const f = useFonts();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
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
        {children}
      </Text>
      <View style={{ flex: 1, height: 1, backgroundColor: c.fg, opacity: 0.3 }} />
    </View>
  );
}

function StampChip({ children, solid }: { children: string; solid?: boolean }) {
  const c = useColors();
  const f = useFonts();
  return (
    <View
      style={{
        borderColor: c.fg,
        borderWidth: 1,
        backgroundColor: solid ? c.accent : c.bg,
        paddingHorizontal: 9,
        paddingVertical: 3,
      }}
    >
      <Text
        allowFontScaling={false}
        style={{
          fontFamily: f.mono,
          fontSize: 10,
          fontWeight: '500',
          letterSpacing: 1.5,
          color: solid ? c.accentFg : c.fg,
          textTransform: 'uppercase',
        }}
      >
        {children}
      </Text>
    </View>
  );
}

function KanjiReading({ label, value }: { label: string; value: string }) {
  const c = useColors();
  const f = useFonts();
  return (
    <View style={{ flexDirection: 'row', gap: 6 }}>
      <Text
        allowFontScaling={false}
        style={{ fontFamily: f.jp, fontSize: 11, color: c.accent, fontWeight: '600' }}
      >
        {label}
      </Text>
      <Text
        allowFontScaling={false}
        numberOfLines={1}
        style={{ fontFamily: f.jp, fontSize: 12, color: c.fg, flex: 1 }}
      >
        {value}
      </Text>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { paddingTop: 4 },
  headBlock: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  chipRow: { flexDirection: 'row', gap: 6, marginTop: 12, flexWrap: 'wrap' },
  meaningsBlock: {},
  meaningRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    gap: 12,
    alignItems: 'flex-start',
  },
  kanjiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  kanjiCard: {
    flexDirection: 'row',
    minWidth: 220,
    flex: 1,
    overflow: 'hidden',
  },
});

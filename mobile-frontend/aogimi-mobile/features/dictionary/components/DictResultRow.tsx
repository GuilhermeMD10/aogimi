import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/theme/ThemeContext';
import { fontFamily, fontSize, radius, spacing } from '@/theme/tokens';
import type { WordResult } from '../types';
import { preferredHeadword } from '../lib/headword';
import { JlptChip } from '@/shared/components/JlptChip';

type Props = {
  word: WordResult;
  query: string;
  index: number;
  /** First row gets an accent left-edge bar, mirroring the web "active" state. */
  active?: boolean;
  onPress: () => void;
};

/** Dense result row. Mirrors the web /dictionary row data depth: mono
 *  `01/02` index on the left, headword + reading + `is_common` dot,
 *  POS / JLPT / per-kanji-grade chip stack, and a numbered list of glosses
 *  underneath. The active row gets a 2px accent edge on the left. */
export function DictResultRow({ word, query, index, active, onPress }: Props) {
  const c = useColors();
  const headword = preferredHeadword(word, query);
  const reading = word.kanji.length > 0 ? word.readings[0]?.form ?? null : null;
  const glosses = word.meanings
    .filter((m) => m.lang === 'eng' || m.lang === 'en')
    .map((m) => m.meaning);
  const pos = word.meanings[0]?.pos ?? null;
  const charGrades = word.char_grades?.filter((cg) => cg.grade != null) ?? [];

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.row,
        {
          // The active row is the raised surface, every other row the sunken
          // one, plus a left accent edge for the existing keyboard-nav
          // highlight. This used to be a hardcoded `#FFFFFF` card — a white
          // slab left over from the light placeholder palette.
          backgroundColor: active ? c.bgElev : c.bgSunken,
          borderColor: c.border,
          borderLeftColor: active ? c.accent : c.border,
        },
      ]}
    >
      <Text style={[styles.indexNum, { color: c.fgSubtle, fontFamily: fontFamily.ui }]}>
        {String(index + 1).padStart(2, '0')}
      </Text>

      <View style={styles.headBlock}>
        <View style={styles.headRow}>
          <Text
            style={[styles.headword, { color: c.fg, fontFamily: fontFamily.jp }]}
            numberOfLines={1}
          >
            {highlightMatch(headword, query, c.fg)}
          </Text>
          {word.is_common && (
            <View
              style={[styles.commonDot, { backgroundColor: c.accent }]}
              accessibilityLabel="Common word"
            />
          )}
        </View>
        {reading && (
          <Text
            style={[styles.reading, { color: c.fgMuted, fontFamily: fontFamily.jp }]}
            numberOfLines={1}
          >
            {reading}
          </Text>
        )}
      </View>

      <View style={styles.body}>
        <View style={styles.chipsRow}>
          {pos && (
            <Chip text={pos} c={c} />
          )}
          {word.jlpt_level != null && <JlptChip level={word.jlpt_level} compact />}
          {charGrades.length > 1 &&
            charGrades.map(({ char, grade }) => (
              <Chip key={char} text={`${char} G${grade}`} c={c} />
            ))}
        </View>
        {glosses.length > 0 && (
          <View style={styles.glossList}>
            {glosses.slice(0, 4).map((g, gi) => (
              <View key={gi} style={styles.glossRow}>
                <Text style={[styles.glossNum, { color: c.fgSubtle, fontFamily: fontFamily.ui }]}>
                  {gi + 1}.
                </Text>
                <Text
                  style={[styles.glossText, { color: c.fg, fontFamily: fontFamily.reader }]}
                  numberOfLines={2}
                >
                  {g}
                </Text>
              </View>
            ))}
            {glosses.length > 4 && (
              <Text style={[styles.glossMore, { color: c.fgSubtle, fontFamily: fontFamily.ui }]}>
                +{glosses.length - 4} more
              </Text>
            )}
          </View>
        )}
      </View>
    </Pressable>
  );
}

function Chip({ text, c }: { text: string; c: { fgMuted: string; border: string; bgElev: string } }) {
  return (
    <View style={[styles.chip, { borderColor: c.border, backgroundColor: c.bgElev }]}>
      <Text style={[styles.chipText, { color: c.fgMuted, fontFamily: fontFamily.ui }]}>{text}</Text>
    </View>
  );
}

function highlightMatch(text: string, query: string, accent: string): React.ReactNode {
  if (!query) return text;
  const idx = text.indexOf(query);
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <Text style={{ color: accent, fontWeight: '700' }}>{text.slice(idx, idx + query.length)}</Text>
      {text.slice(idx + query.length)}
    </>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 14,
    paddingHorizontal: 12,
    gap: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderLeftWidth: 2,
    borderRadius: 10,
    marginBottom: 8,
  },
  indexNum: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1,
    fontVariant: ['tabular-nums'],
    minWidth: 22,
    paddingTop: 6,
  },
  headBlock: {
    minWidth: 88,
    maxWidth: 130,
  },
  headRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headword: {
    fontSize: 26,
    fontWeight: '500',
    letterSpacing: -0.3,
  },
  commonDot: {
    width: 6,
    height: 6,
    borderRadius: radius.pill,
  },
  reading: {
    fontSize: 13,
    marginTop: 2,
  },
  body: {
    flex: 1,
    minWidth: 0,
    gap: 6,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  chipText: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  glossList: {
    gap: 3,
  },
  glossRow: {
    flexDirection: 'row',
    gap: 6,
  },
  glossNum: {
    fontSize: 11,
    fontVariant: ['tabular-nums'],
    paddingTop: 2,
    minWidth: 14,
  },
  glossText: {
    flex: 1,
    fontSize: fontSize.sm,
    lineHeight: 19,
  },
  glossMore: {
    fontSize: 10,
    letterSpacing: 0.5,
    marginTop: 2,
  },
});

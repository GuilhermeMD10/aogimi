import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Card } from '@/shared/components/Card';
import { Touchable } from '@/shared/components/Touchable';
import { JlptChip } from '@/shared/components/JlptChip';
import { usePalette } from '@/theme/ThemeContext';
import { spacing, type, type Palette } from '@/theme/tokens';
import type { KanjiInfo } from '../types';

/**
 * One character of KANJI IN THIS WORD — a Tier 2 card with the glyph in a
 * left column and its facts in rows on the right.
 *
 * **Full-width and stacked**, not a horizontal scroller — a swipeable card
 * strip hides the second kanji of a two-kanji word behind a swipe nobody
 * knows is there.
 *
 * Beyond MEANING / ON / KUN, strokes, grade and radical are shown: KANJIDIC
 * gives them for free, they are the three facts a learner looks up next, and
 * they cost one muted line at the bottom.
 *
 * Pressable when `onPress` is given — the tap starts a fresh search for that
 * character, which is the drill-down the tab's frame stack exists for.
 */
export function KanjiBreakdownCard({
  kanji,
  compact = false,
  onPress,
}: {
  kanji: KanjiInfo;
  compact?: boolean;
  onPress?: () => void;
}) {
  const p = usePalette();
  const styles = useStyles(p);

  const meta = [
    kanji.stroke_count != null ? `${kanji.stroke_count} strokes` : null,
    kanji.grade != null ? `grade ${kanji.grade}` : null,
    kanji.radical != null ? `radical ${kanji.radical}` : null,
  ].filter((v): v is string => v !== null);

  const card = (
    <Card style={styles.card}>
      <View style={styles.glyphColumn}>
        <Text style={[styles.glyph, compact && styles.glyphCompact]}>{kanji.literal}</Text>
        {kanji.jlpt_level != null && <JlptChip level={kanji.jlpt_level} compact />}
      </View>

      <View style={styles.rows}>
        {kanji.meanings.length > 0 && (
          <InfoRow label="meaning" value={kanji.meanings.slice(0, 4).join(', ')} />
        )}
        <InfoRow label="on" value={kanji.on_readings.join('、') || '—'} jp />
        <InfoRow label="kun" value={kanji.kun_readings.join('、') || '—'} jp />
        {meta.length > 0 && <Text style={styles.meta}>{meta.join('  ·  ')}</Text>}
      </View>
    </Card>
  );

  // A card without `onPress` is a display card — wrapping it in a pressable
  // would announce it as a button to a screen reader.
  if (onPress === undefined) return card;
  return (
    <Touchable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Search ${kanji.literal}`}
      minTarget={false}
    >
      {card}
    </Touchable>
  );
}

/** An eyebrow label in a fixed column with its value beside it. */
function InfoRow({ label, value, jp = false }: { label: string; value: string; jp?: boolean }) {
  const p = usePalette();
  const styles = useStyles(p);
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, jp && styles.infoValueJp]}>{value}</Text>
    </View>
  );
}

function useStyles(p: Palette) {
  return useMemo(
    () =>
      StyleSheet.create({
        card: { flexDirection: 'row', gap: spacing.lg },

        glyphColumn: { alignItems: 'center', gap: spacing.sm },
        /** The phone display size for the page, a step down in the sheet —
         *  both in the Medium JP cut. */
        glyph: { ...type.displayKanjiMobile, color: p.ink },
        glyphCompact: { fontSize: 30, lineHeight: 36, letterSpacing: 0.6 },

        rows: { flex: 1, minWidth: 0, gap: spacing.xs },
        infoRow: { flexDirection: 'row', gap: spacing.sm },
        infoLabel: {
          width: 52,
          ...type.eyebrow,
          textTransform: 'uppercase',
          color: p.faint,
          paddingTop: 4,
        },
        infoValue: { flex: 1, ...type.bodySm, color: p.ink },
        infoValueJp: {
          fontFamily: type.titleReading.fontFamily,
          fontSize: 13,
          lineHeight: 20,
          color: p.muted,
        },
        meta: { ...type.monoMeta, color: p.faint, marginTop: 2 },
      }),
    [p],
  );
}

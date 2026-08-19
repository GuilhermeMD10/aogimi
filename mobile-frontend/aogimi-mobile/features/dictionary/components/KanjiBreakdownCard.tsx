import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { JlptChip } from '@/shared/components/JlptChip';
import { usePalette } from '@/theme/ThemeContext';
import { fontFamily, fontSize, radius, spacing, type Palette } from '@/theme/tokens';
import type { KanjiInfo } from '../types';

/**
 * One character of KANJI IN THIS WORD.
 *
 * **Full-width and stacked**, per the handoff — the outgoing version was a
 * 240px card in a horizontal scroller, which hid the second kanji of a
 * two-kanji word behind a swipe nobody knew was there.
 *
 * The handoff draws MEANING / ON / KUN and stops. Strokes, grade and radical
 * stay: KANJIDIC gives them for free, they are the three facts a learner looks
 * up next, and they cost one muted line at the bottom.
 *
 * Pressable when `onPress` is given — the tap starts a fresh search for that
 * character, which is the drill-down the tab's frame stack exists for. The
 * handoff has no notion of it; it is an existing feature and stays.
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

  const content = (
    <>
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
    </>
  );

  if (onPress === undefined) {
    return <View style={[styles.card, compact && styles.cardCompact]}>{content}</View>;
  }
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Search ${kanji.literal}`}
      style={[styles.card, compact && styles.cardCompact]}
    >
      {content}
    </Pressable>
  );
}

/** A fixed-width mono label with its value — the handoff's 50px label column. */
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
        card: {
          flexDirection: 'row',
          gap: spacing.md,
          padding: spacing.md + 3,
          borderRadius: radius.md,
          backgroundColor: p.paper,
          borderWidth: 1,
          borderColor: p.paperBd,
        },
        cardCompact: { padding: spacing.md, gap: spacing.sm + 2 },

        glyphColumn: { alignItems: 'center', gap: spacing.sm },
        glyph: {
          fontFamily: fontFamily.jp,
          fontSize: 40,
          lineHeight: 46,
          color: p.ink,
        },
        glyphCompact: { fontSize: 32, lineHeight: 38 },

        rows: { flex: 1, minWidth: 0, gap: 4 },
        infoRow: { flexDirection: 'row', gap: spacing.sm },
        infoLabel: {
          width: 50,
          fontFamily: fontFamily.mono,
          fontSize: fontSize.xs - 2.5,
          letterSpacing: 0.5,
          textTransform: 'uppercase',
          color: p.faint,
          paddingTop: 2,
        },
        infoValue: {
          flex: 1,
          fontFamily: fontFamily.ui,
          fontSize: fontSize.sm - 1,
          lineHeight: 17,
          color: p.ink,
        },
        infoValueJp: {
          fontFamily: fontFamily.jp,
          fontSize: fontSize.sm - 0.5,
          color: p.soft,
        },
        meta: {
          fontFamily: fontFamily.mono,
          fontSize: fontSize.xs - 2,
          letterSpacing: 0.5,
          color: p.faint,
          marginTop: 2,
        },
      }),
    [p],
  );
}

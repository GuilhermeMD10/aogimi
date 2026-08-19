import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { usePalette } from '@/theme/ThemeContext';
import { fontFamily, fontSize, spacing, type Palette } from '@/theme/tokens';

/**
 * The tracked micro-label that opens each block — RESULTS, MEANINGS 意味,
 * KANJI IN THIS WORD 漢字.
 *
 * Not `shared/components/RowGroup`'s `SectionLabel`, which is the same face and
 * tracking but carries the settings list's fixed margins and takes a single
 * string. This one pairs the label with its Japanese gloss (which the handoff
 * sets beside every heading in the dictionary) and lets the caller own spacing.
 */
export function SectionHeading({
  label,
  gloss,
  tone = 'muted',
  trailing,
}: {
  label: string;
  /** The Japanese counterpart set beside the label — 意味, 漢字, 例文. */
  gloss?: string;
  /** `accent` is the handoff's vermillion RESULTS label; everything else is muted. */
  tone?: 'muted' | 'accent';
  /** Right-hand text on the same baseline — the results count. */
  trailing?: React.ReactNode;
}) {
  const p = usePalette();
  const styles = useStyles(p);
  return (
    <View style={styles.row}>
      <Text style={[styles.label, tone === 'accent' && styles.accent]}>{label}</Text>
      {gloss !== undefined && <Text style={styles.gloss}>{gloss}</Text>}
      {trailing !== undefined && <View style={styles.trailing}>{trailing}</View>}
    </View>
  );
}

function useStyles(p: Palette) {
  return useMemo(
    () =>
      StyleSheet.create({
        row: {
          flexDirection: 'row',
          alignItems: 'baseline',
          gap: spacing.sm,
        },
        label: {
          fontFamily: fontFamily.mono,
          fontSize: fontSize.xs - 1.5,
          fontWeight: '500',
          letterSpacing: 2,
          textTransform: 'uppercase',
          color: p.muted,
        },
        accent: { color: p.accent },
        gloss: {
          fontFamily: fontFamily.jp,
          fontSize: fontSize.xs,
          color: p.faint,
        },
        trailing: { flex: 1 },
      }),
    [p],
  );
}

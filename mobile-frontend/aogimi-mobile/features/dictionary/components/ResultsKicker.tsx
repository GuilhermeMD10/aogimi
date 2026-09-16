import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { usePalette } from '@/theme/ThemeContext';
import { type, type Palette } from '@/theme/tokens';

/**
 * `RESULTS · 8 for · 「じしょ」` — the line above a result list, as both
 * dictionary compositions and the reader pop-up draw it: the label in accent,
 * the count in `faint`, the quoted query in the JP bold cut, all at the 11px
 * mono-meta size.
 *
 * One component because the tab and the drawer both render it and the three
 * inks have to agree.
 */
export function ResultsKicker({
  label,
  countLabel,
  query,
}: {
  label: string;
  /** Already formatted — `8 for`, `20+ for`. */
  countLabel: string;
  query: string;
}) {
  const p = usePalette();
  const styles = useStyles(p);
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.count}>{countLabel}</Text>
      <Text style={styles.query} numberOfLines={1}>
        「{query}」
      </Text>
    </View>
  );
}

function useStyles(p: Palette) {
  return useMemo(
    () =>
      StyleSheet.create({
        row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
        label: { ...type.monoMeta, letterSpacing: 1.1, textTransform: 'uppercase', color: p.accent },
        count: { ...type.monoMeta, letterSpacing: 0, color: p.faint },
        query: {
          fontFamily: type.titleKanji.fontFamily,
          fontSize: 11,
          fontWeight: '700',
          lineHeight: 14,
          color: p.ink,
          flexShrink: 1,
        },
      }),
    [p],
  );
}

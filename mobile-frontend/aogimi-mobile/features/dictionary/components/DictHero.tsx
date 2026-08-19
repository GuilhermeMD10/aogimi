import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { usePalette } from '@/theme/ThemeContext';
import { fontFamily, fontSize, spacing, type Palette } from '@/theme/tokens';

/**
 * The empty state's centred title block: a Japanese kicker, the headline, and
 * one line of caption.
 *
 * Text only — the search field sits below it and belongs to the view, which
 * owns the query. That split is what keeps the field in the same place whether
 * or not the hero is showing.
 */
export function DictHero({
  kicker,
  title,
  caption,
}: {
  /** Japanese — 引いてみる. Takes the `jp` face and the accent ink. */
  kicker: string;
  title: string;
  caption: string;
}) {
  const p = usePalette();
  const styles = useStyles(p);
  return (
    <View style={styles.wrap}>
      <Text style={styles.kicker}>{kicker}</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.caption}>{caption}</Text>
    </View>
  );
}

function useStyles(p: Palette) {
  return useMemo(
    () =>
      StyleSheet.create({
        wrap: { alignItems: 'center', marginTop: spacing.xl + 6 },
        kicker: {
          fontFamily: fontFamily.jp,
          fontSize: fontSize.lg + 2,
          letterSpacing: 2.5,
          color: p.accent,
        },
        title: {
          fontFamily: fontFamily.ui,
          // 30px sits above the `fontSize` scale's `xxl` (24) and below
          // `display` (32), and this is the one line it applies to.
          fontSize: 30,
          lineHeight: 34,
          fontWeight: '700',
          color: p.ink,
          marginTop: spacing.sm + 2,
          textAlign: 'center',
        },
        caption: {
          fontFamily: fontFamily.ui,
          fontSize: fontSize.sm,
          color: p.muted,
          marginTop: spacing.sm + 1,
          textAlign: 'center',
        },
      }),
    [p],
  );
}

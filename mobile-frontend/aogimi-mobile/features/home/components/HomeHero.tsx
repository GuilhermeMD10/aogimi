import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { usePalette } from '@/theme/ThemeContext';
import { fontFamily, fontSize, spacing, type Palette } from '@/theme/tokens';

/**
 * The greeting block — the handoff's 30px salutation and its one-line
 * subcaption.
 *
 * The greeting is omitted entirely when there is no name to use, rather than
 * falling back to a nameless "おかえり": a signed-out user has not come back
 * from anywhere, and the subcaption alone reads fine as a standalone opener.
 */
export function HomeHero({ greeting, caption }: { greeting: string | null; caption: string }) {
  const p = usePalette();
  const styles = useStyles(p);

  return (
    <View>
      {greeting !== null && (
        <Text style={styles.greeting} numberOfLines={1}>
          {greeting}
        </Text>
      )}
      <Text style={styles.caption}>{caption}</Text>
    </View>
  );
}

function useStyles(p: Palette) {
  return useMemo(
    () =>
      StyleSheet.create({
        greeting: {
          // 30px is the handoff's, and sits between `fontSize.xxl` (24) and
          // `display` (32) — a one-off rather than a new scale step, since
          // nothing else in the app is this size.
          fontFamily: fontFamily.jp,
          fontSize: 30,
          fontWeight: '700',
          lineHeight: 33,
          color: p.ink,
          marginTop: spacing.lg + 2,
        },
        caption: {
          fontFamily: fontFamily.ui,
          fontSize: fontSize.sm,
          color: p.soft,
          marginTop: spacing.xs + 2,
        },
      }),
    [p],
  );
}

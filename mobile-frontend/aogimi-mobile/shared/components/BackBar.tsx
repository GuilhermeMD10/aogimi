import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { BackButton } from './BackButton';
import { useT } from '@/lib/i18n/I18nContext';
import { usePalette, fontFamily, fontSize, spacing, type Palette } from '@/theme';

/**
 * The way out of a pushed screen, plus the screen's heading.
 *
 * The control itself is `BackButton` — a bare chevron over a 44pt square. It
 * used to be a chevron *and* the word "Back" on one row, which was a line of
 * text pretending to be a button: the label said nothing the chevron does not,
 * and the hit area was the height of the glyph. See `BackButton` for the rest.
 *
 * Extracted from `LanguageView` / `AppearanceView`, which had identical copies,
 * when Profile and Settings became the third and fourth callers.
 *
 * `title` renders the screen heading beneath the row, since every caller pairs
 * the two and the spacing between them is part of this block, not the page.
 */
export function BackBar({
  title,
  subtitle,
  right,
  onBack,
}: {
  title: string;
  /** Optional Japanese gloss beside the title. */
  subtitle?: string;
  /** Trailing controls on the title line — Profile's Edit + Settings buttons. */
  right?: React.ReactNode;
  /** Defaults to `router.back()`; pass one only to intercept the exit. */
  onBack?: () => void;
}) {
  const p = usePalette();
  const t = useT();
  const router = useRouter();
  const styles = useStyles(p);

  return (
    <View style={styles.wrap}>
      <BackButton label={t('common.back')} onPress={onBack ?? (() => router.back())} />

      <View style={styles.titleRow}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {subtitle !== undefined && <Text style={styles.subtitle}>{subtitle}</Text>}
        {right !== undefined && <View style={styles.right}>{right}</View>}
      </View>
    </View>
  );
}

function useStyles(p: Palette) {
  return useMemo(
    () =>
      StyleSheet.create({
        wrap: { marginBottom: spacing.md },
        titleRow: {
          flexDirection: 'row',
          alignItems: 'baseline',
          gap: spacing.sm,
          marginTop: spacing.xs,
        },
        title: {
          fontFamily: fontFamily.ui,
          fontSize: fontSize.lg + 1,
          fontWeight: '700',
          color: p.ink,
        },
        subtitle: {
          fontFamily: fontFamily.jp,
          fontSize: fontSize.sm,
          color: p.faint,
        },
        right: { marginLeft: 'auto', flexDirection: 'row', gap: spacing.sm - 2 },
      }),
    [p],
  );
}

import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import { useT } from '@/lib/i18n/I18nContext';
import { usePalette } from '@/theme/ThemeContext';
import { fontFamily, fontSize, spacing, type Palette } from '@/theme/tokens';

/**
 * The way out of a pushed screen: a chevron and the word "Back".
 *
 * **This is the app's existing affordance, kept on purpose.** The design
 * handoff draws it as a 38px bordered box holding a bare chevron; a boxed
 * icon-only control is both a smaller target and less obvious than a labelled
 * one, and every pushed screen in the app already uses this row. Keeping it
 * means Profile, Settings and the settings sub-pages all exit the same way.
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
  /** Optional Japanese gloss beside the title, as the handoff draws it. */
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
      <Pressable
        onPress={onBack ?? (() => router.back())}
        hitSlop={10}
        accessibilityRole="button"
        style={styles.backRow}
      >
        <Feather name="chevron-left" size={22} color={p.ink} />
        <Text style={styles.backLabel}>{t('common.back')}</Text>
      </Pressable>

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
        backRow: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 2,
          marginBottom: spacing.sm,
          // Pulled left so the chevron's own glyph padding lines the *label* up
          // with the title below it rather than the icon box.
          marginLeft: -6,
        },
        backLabel: {
          fontFamily: fontFamily.ui,
          fontSize: fontSize.md,
          color: p.ink,
        },
        titleRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm },
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

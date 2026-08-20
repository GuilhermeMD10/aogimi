import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Touchable } from '@/shared/components/Touchable';
import Feather from '@expo/vector-icons/Feather';
import { BookCover } from '@/features/books/library/components/BookCover';
import type { BookRecord } from '@/features/books/types';
import { usePalette } from '@/theme/ThemeContext';
import { fontFamily, fontSize, radius, spacing, type Palette } from '@/theme/tokens';
import { Card } from './HomeCard';

/**
 * "Continue reading" — the single most recently opened in-progress book.
 *
 * **Percentage only, no page numbers.** "PAGE 142 / 412" cannot be honestly
 * rendered: `page_count` is PDF-only and null for every EPUB, so the pair
 * would be present on some books and missing on others. A percentage is
 * defined for all of them and is what the progress bar shows anyway.
 *
 * The caller renders nothing when there is no in-progress book — see
 * `HomeView`. That absence *is* the empty state; there is no placeholder card.
 */
export function ContinueReadingCard({
  book,
  kicker,
  resumeLabel,
  onResume,
}: {
  book: BookRecord;
  /** The card's micro-label, e.g. "CONTINUE READING". */
  kicker: string;
  resumeLabel: string;
  onResume: () => void;
}) {
  const p = usePalette();
  const styles = useStyles(p);
  // Clamped because the bar is a percentage *width*: a book that reported >100
  // (a stale sync, a malformed CFI) would otherwise overflow its track.
  const pct = Math.max(0, Math.min(100, book.progress));

  return (
    <Card>
      <Text style={styles.kicker}>{kicker}</Text>
      <View style={styles.row}>
        <BookCover
          title={book.title}
          coverColor={book.cover_color}
          filename={book.filename}
          width={62}
          height={88}
          cornerRadius={radius.sm}
        />
        <View style={styles.meta}>
          <Text style={styles.title} numberOfLines={2}>
            {book.title}
          </Text>
          <Text style={styles.pct}>{Math.round(pct)}%</Text>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${pct}%` }]} />
          </View>
          <Touchable
            minTarget={false}
            onPress={onResume}
            accessibilityRole="button"
            style={styles.button}
          >
            <Feather name="play" size={12} color={p.btnInk} />
            <Text style={styles.buttonLabel}>{resumeLabel}</Text>
          </Touchable>
        </View>
      </View>
    </Card>
  );
}

function useStyles(p: Palette) {
  return useMemo(
    () =>
      StyleSheet.create({
        kicker: {
          fontFamily: fontFamily.mono,
          fontSize: fontSize.xs - 2.5,
          letterSpacing: 1.4,
          color: p.faint,
        },
        row: { flexDirection: 'row', gap: spacing.md + 2, marginTop: spacing.xs + 1 },
        // `minWidth: 0` so a long title truncates instead of pushing the cover
        // off the card — the RN flexbox equivalent of the web's min-width trap.
        meta: { flex: 1, minWidth: 0 },
        title: {
          fontFamily: fontFamily.ui,
          fontSize: fontSize.lg,
          fontWeight: '700',
          color: p.ink,
          marginTop: 3,
        },
        pct: {
          fontFamily: fontFamily.mono,
          fontSize: fontSize.xs - 1,
          color: p.muted,
          marginTop: spacing.xs,
        },
        track: {
          height: 5,
          borderRadius: 3,
          backgroundColor: p.track,
          overflow: 'hidden',
          marginTop: spacing.xs + 1,
        },
        fill: { height: '100%', backgroundColor: p.fill },
        button: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: spacing.sm - 1,
          height: 40,
          borderRadius: radius.md,
          backgroundColor: p.btn,
          marginTop: spacing.md - 2,
        },
        buttonLabel: {
          fontFamily: fontFamily.ui,
          fontSize: fontSize.sm,
          fontWeight: '700',
          color: p.btnInk,
        },
      }),
    [p],
  );
}

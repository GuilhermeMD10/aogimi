import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Card } from '@/shared/components/Card';
import { Button } from '@/shared/components/Button';
import { ProgressBar } from '@/shared/components/ProgressBar';
import { BookCover } from '@/features/books/library/components/BookCover';
import type { BookRecord } from '@/features/books/types';
import { usePalette } from '@/theme/ThemeContext';
import { spacing, type, type Palette } from '@/theme/tokens';

/** DESIGN.md's book row: a 64pt cover with an 8px radius. The height is the
 *  column beside it — title, percentage, bar, button and their gaps. */
const COVER_W = 64;
const COVER_H = 96;
const COVER_R = 8;

/**
 * "Continue reading" — the single most recently opened in-progress book.
 *
 * **Percentage only, no page numbers.** "PAGE 142 / 412" cannot be honestly
 * rendered: `page_count` is PDF-only and null for every EPUB, so the pair would
 * be present on some books and missing on others. A percentage is defined for
 * all of them and is what the progress bar shows anyway.
 *
 * The caller renders nothing when there is no in-progress book — see
 * `HomeView`. That absence *is* the empty state; there is no placeholder card.
 */
export function ContinueReadingCard({
  book,
  progressLabel,
  resumeLabel,
  onResume,
}: {
  book: BookRecord;
  /** Already interpolated, e.g. `64% read`. */
  progressLabel: string;
  resumeLabel: string;
  onResume: () => void;
}) {
  const p = usePalette();
  const styles = useStyles(p);

  return (
    <Card style={styles.card}>
      <BookCover
        title={book.title}
        coverColor={book.cover_color}
        filename={book.filename}
        width={COVER_W}
        height={COVER_H}
        cornerRadius={COVER_R}
      />
      {/* `minWidth: 0` so a long title truncates instead of pushing the cover
          off the card — the RN flexbox equivalent of the web's min-width trap. */}
      <View style={styles.meta}>
        <Text style={styles.title} numberOfLines={2}>
          {book.title}
        </Text>
        <Text style={styles.pct}>{progressLabel}</Text>
        {/* 6pt rather than the default 4: DESIGN.md thickens the track inside a
            book row, where it sits beside a cover and has to hold its own. */}
        <ProgressBar value={book.progress} height={6} />
        <Button label={resumeLabel} variant="secondary" size="small" onPress={onResume} full />
      </View>
    </Card>
  );
}

function useStyles(p: Palette) {
  return useMemo(
    () =>
      StyleSheet.create({
        card: { flexDirection: 'row', gap: spacing.md },
        meta: { flex: 1, minWidth: 0, gap: 6, justifyContent: 'center' },
        title: {
          // A book title is Japanese far more often than not, so it takes the
          // JP face at DESIGN.md's book-row size.
          fontFamily: type.titleKanji.fontFamily,
          fontSize: 15,
          fontWeight: '700',
          lineHeight: 21,
          color: p.ink,
        },
        pct: { ...type.labelInterval, color: p.muted },
      }),
    [p],
  );
}

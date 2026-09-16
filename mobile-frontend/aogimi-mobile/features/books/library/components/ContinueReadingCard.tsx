import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '@/shared/components/Button';
import { Card } from '@/shared/components/Card';
import { Tag } from '@/shared/components/Chip';
import { ProgressBar } from '@/shared/components/ProgressBar';
import { Touchable } from '@/shared/components/Touchable';
import { usePalette } from '@/theme/ThemeContext';
import { useT } from '@/lib/i18n/I18nContext';
import { formatRelativeTime } from '@/lib/relativeTime';
import { spacing, type, type Palette } from '@/theme/tokens';
import type { BookRecord } from '../../types';
import { BookCover } from './BookCover';

/**
 * The cover takes the **card's full height** and derives its width from its own
 * proportions — it is not a fixed slot.
 *
 * `Library.dc.html` draws a 50×68 stamp, which is smaller than the artwork
 * deserves and leaves a band of empty card beside it as soon as the meta column
 * runs past 68pt. Stretching it instead means the column decides the card's
 * height and the cover fills it, so a book is as large here as the card allows.
 *
 * This is the fallback ratio only: `BookCover` measures the real artwork on
 * load and takes its aspect from that, so a tall or square cover keeps its own
 * shape rather than being letterboxed into a 3:4 box.
 */
const COVER_ASPECT = 3 / 4;
const COVER_R = 8;

/**
 * **"Continue reading" — the book you were last reading, with one tap back into
 * it.** The shelf's hero, and Home's card: one component, two callers.
 *
 * It was two near-copies. Home's had no eyebrow and no author, showed a
 * pre-interpolated `64% read` instead of the time-and-percentage row, and took
 * its copy as four props from `HomeView`; the shelf's owned its own copy and
 * carried the cross-device state. Neither was a variant of the other on purpose
 * — they were written in different sessions — and the pair had already drifted
 * two type sizes apart. This is the shelf's, which is the more complete of the
 * two, and it owns its own strings.
 *
 * The **one** thing that genuinely differs is `cta`: see the prop.
 *
 * ── The meta row carries the time, not the word "Progress" ─────────────────
 * `Library.dc.html` labels that row `Progress` on the left and `64%` on the
 * right. The word is redundant next to a progress bar, and the slot is the only
 * place on the card where something the reader cannot see anywhere else fits:
 * *when* they put the book down. So the left side is the relative time in the
 * mono meta role and the right side is the percentage in accent, which is the
 * composition's shape with the label's slot spent on information.
 *
 * `hasFile` false is the cross-device case: the record is on the account but
 * the file is not on this phone. The progress row, the bar and the CTA all go —
 * there is no progress to resume — and the card becomes a prompt to import.
 * The shelf only ever picks a hero it can open, so this is a guard rather than
 * a state the reader normally sees.
 *
 * **The whole card is tappable and so is its CTA.** The card was the only
 * target before the redesign added the button, and taking that away would
 * shrink a 130pt target to a 36pt one for the same action. RN gives a nested
 * pressable the press, so the button still gets its own feedback.
 */
export function ContinueReadingCard({
  book,
  hasFile = true,
  cta = 'primary',
  onPress,
}: {
  book: BookRecord;
  hasFile?: boolean;
  /**
   * How loud the resume button is.
   *
   * `primary` on the shelf, where resuming is the screen's one loud action.
   * `secondary` on Home, where it sits above `StudyCard`'s `Start Review` —
   * DESIGN.md gives a card at most one primary, and two stacked sakura fills
   * make the reader choose between two shouts instead of reading one.
   */
  cta?: 'primary' | 'secondary';
  onPress?: () => void;
}) {
  const p = usePalette();
  const t = useT();
  const s = useStyles(p);

  return (
    <Touchable
      onPress={onPress}
      minTarget={false}
      accessibilityRole="button"
      accessibilityLabel={book.title}
    >
      <Card style={s.card}>
        {/* No width or height: `alignItems: 'stretch'` on the row gives it the
            card's height, and `aspectRatio` turns that into a width. */}
        <BookCover
          title={book.title}
          coverColor={book.cover_color}
          filename={hasFile ? book.filename : undefined}
          aspectRatio={COVER_ASPECT}
          cornerRadius={COVER_R}
          style={hasFile ? s.cover : s.coverFaded}
        />

        {/* `minWidth: 0` so a long title truncates instead of pushing the cover
            off the card — RN flexbox's version of the web's min-width trap. */}
        <View style={s.meta}>
          <Tag label={t('library.continueReading')} tone={p.accent} style={s.tag} />

          <Text style={s.title} numberOfLines={1}>
            {book.title}
          </Text>
          <Text style={s.author} numberOfLines={1}>
            {book.author || '—'}
          </Text>

          {hasFile ? (
            <>
              <View style={s.progressRow}>
                <Text style={s.when}>{formatRelativeTime(book.last_read_at)}</Text>
                <Text style={s.pct}>{`${Math.round(book.progress)}%`}</Text>
              </View>
              {/* 6pt rather than the default 4: DESIGN.md thickens the track
                  inside a book row, where it sits beside a cover and has to hold
                  its own. */}
              <ProgressBar value={book.progress} height={6} />
              <Button
                label={t('library.resume')}
                icon="play"
                variant={cta}
                size="small"
                onPress={onPress}
                style={s.cta}
              />
            </>
          ) : (
            <Text style={s.missing}>{t('library.notOnDeviceHint')}</Text>
          )}
        </View>
      </Card>
    </Touchable>
  );
}

function useStyles(p: Palette) {
  return useMemo(
    () =>
      StyleSheet.create({
        // `stretch`, so the cover takes the height the meta column sets rather
        // than pinning to the top of it. The column is the only thing here with
        // an intrinsic height, which is what keeps the sizing non-circular.
        card: { flexDirection: 'row', gap: spacing.md, alignItems: 'stretch' },
        /**
         * The ceiling on how much of the card the artwork may take.
         *
         * Width is derived from height here, and `BookCover` swaps in the real
         * cover's aspect once the image loads — so a landscape cover (a manga
         * spread, a square art book) would resolve *wider* than it is tall and
         * squeeze the meta column to nothing, since RN's default `flexShrink`
         * is 0 and the column could not push back. At a normal 3:4 this cap is
         * never reached; a wide cover hits it and letterboxes inside its box,
         * which `resizeMode: 'contain'` already handles.
         */
        cover: { maxWidth: '40%' },
        /** The same box, dimmed — the file is not on this device. */
        coverFaded: { maxWidth: '40%', opacity: 0.45 },
        meta: { flex: 1, minWidth: 0, gap: spacing.xs },
        /** The tag sizes to its label; without this it stretches the column. */
        tag: { alignSelf: 'flex-start' },

        // The column runs a step below the composition's type throughout. Its
        // hero sets 17/12 beside a 68pt stamp; here the cover is as tall as the
        // card, so the column's job is to stay compact enough not to out-shout
        // it — and every point the column loses is a point of cover width.
        title: {
          // A book title is Japanese far more often than not, so it takes the
          // JP face.
          fontFamily: type.titleKanji.fontFamily,
          fontSize: 15,
          fontWeight: '700',
          lineHeight: 20,
          color: p.ink,
        },
        author: { ...type.labelInterval, color: p.faint },

        progressRow: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: spacing.sm,
        },
        when: { ...type.monoMeta, color: p.faint, flexShrink: 1 },
        pct: {
          ...type.monoMeta,
          fontFamily: type.headlineMd.fontFamily,
          color: p.accent,
        },

        // Sized to its label rather than to the column: a full-width sakura
        // fill is a lot of shouting for "open the book you just closed", and
        // the whole card is a target for the same action anyway.
        cta: { marginTop: spacing.xs, alignSelf: 'flex-start' },
        missing: { ...type.caption, color: p.faint, fontStyle: 'italic' },
      }),
    [p],
  );
}

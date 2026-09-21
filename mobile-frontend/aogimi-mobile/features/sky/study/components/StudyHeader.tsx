import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { IconButton } from '@/shared/components/IconButton';
import { ProgressBar } from '@/shared/components/ProgressBar';
import { usePalette } from '@/theme/ThemeContext';
import { useT } from '@/lib/i18n/I18nContext';
import { spacing, type, type Palette } from '@/theme/tokens';

/** DESIGN.md's header row. Same 60pt as `Header`, different contents. */
const BAR_H = 60;

/**
 * The session's header — `Study.dc.html`'s `[44 back] [12] [deck label +
 * counter over a 4pt track]`.
 *
 * **Not the `Header` primitive.** That one centres a title between two fixed
 * end slots, and this row has no title and no trailing slot: the whole middle
 * is a left-aligned progress stack. Sharing the primitive would mean adding a
 * mode that replaces its entire centre, which is a different component wearing
 * the same name. It keeps the 60pt height and the 44pt circle so the two rows
 * still line up if a user moves between them.
 *
 * ── The counter's arithmetic ───────────────────────────────────────────────
 * `12 / 40 · 28 left` — cards *answered* over the session's size, and the
 * remainder of that same subtraction. Not the live queue length, which an
 * Again requeue makes larger than the cards outstanding: the three figures and
 * the bar all have to tell one story, and the story is "you have answered 12
 * of 40". The queue is how the session gets there, not what it promises.
 */
export function StudyHeader({
  deckLabel,
  reviewed,
  total,
  onBack,
}: {
  /** The deck being studied. Empty in a cross-deck session, which falls back
   *  to naming the scope rather than leaving the slot blank. */
  deckLabel: string;
  reviewed: number;
  total: number;
  /** Ends the session on the cards answered so far — see `StudyScreen`. */
  onBack: () => void;
}) {
  const p = usePalette();
  const t = useT();
  const s = useStyles(p);

  const left = Math.max(0, total - reviewed);
  const pct = total > 0 ? (reviewed / total) * 100 : 0;

  return (
    <View style={s.row}>
      <IconButton
        glyph="back"
        onPress={onBack}
        accessibilityLabel={t('study.finishSession')}
      />

      <View style={s.stack}>
        <View style={s.line}>
          <Text style={s.deck} numberOfLines={1}>
            {deckLabel.length > 0 ? deckLabel : t('study.allDecks')}
          </Text>
          <Text style={s.counter} numberOfLines={1}>
            {t('study.progress', { done: reviewed, total, left })}
          </Text>
        </View>
        <ProgressBar value={pct} animated />
      </View>
    </View>
  );
}

function useStyles(p: Palette) {
  return useMemo(
    () =>
      StyleSheet.create({
        row: {
          height: BAR_H,
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.md,
        },
        stack: { flex: 1, minWidth: 0, gap: 6 },
        /** Baseline, not centre: the 10pt eyebrow and the 11pt counter sit on
         *  one line only if they share it. */
        line: {
          flexDirection: 'row',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: spacing.sm,
        },
        deck: { ...type.eyebrow, color: p.faint, textTransform: 'uppercase', flexShrink: 1 },
        counter: {
          ...type.monoMeta,
          fontSize: 12,
          color: p.muted,
          fontVariant: ['tabular-nums'],
          flexShrink: 0,
        },
      }),
    [p],
  );
}

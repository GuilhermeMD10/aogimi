import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { IconButton } from '@/shared/components/IconButton';
import { usePalette } from '@/theme/ThemeContext';
import { useT } from '@/lib/i18n/I18nContext';
import { spacing, type, type Palette } from '@/theme/tokens';

/** DESIGN.md's header row: 60pt tall, a 44pt circle at each end, 12pt gaps. */
const BAR_H = 60;
const SLOT = 44;

/**
 * Top-edge chrome for the reader: the way out, the book, and how far through it
 * you are.
 *
 * ── The three slots ────────────────────────────────────────────────────────
 * `[44pt back circle] [12] [title, centred] [12] [44pt progress]` — DESIGN.md's
 * header row, with the right-hand 44pt spent on the percentage rather than on a
 * more-button the reader has nothing to put in. The title is **centred in the
 * row, not in the space left over**: both end slots are exactly 44pt wide, so
 * the centre of the flexed middle is the centre of the screen, and the title
 * does not shift when the percentage goes from `9%` to `100%`.
 *
 * It is capped at 70% of that middle (the handoff's figure) so a long Japanese
 * title truncates well short of the two circles instead of crowding them.
 *
 * ── The chevron is a real button now ───────────────────────────────────────
 * It was a bare 30pt glyph pulled outside the row's own padding, which is the
 * shape back navigation had before the app had an `IconButton`: a control sized
 * to its icon. Now it is the same 44pt glass circle as every other pushed
 * screen's, which is also what makes the row read as a header rather than as
 * three things that happen to be at the top.
 *
 * This bar sits on the app canvas, above the page — so it takes the app
 * palette's Tier 2 glass, unlike the dock, which floats **on** the page and
 * takes `readerChrome` instead.
 */
export function ReaderTopBar({
  title,
  progress,
  onBack,
}: {
  title: string;
  /** 0–100. */
  progress: number;
  /** Leave the book. Omitted by callers that have no library to go back to. */
  onBack?: () => void;
}) {
  const p = usePalette();
  const t = useT();
  const s = useStyles(p);

  return (
    <View pointerEvents="box-none" style={s.row}>
      <View style={s.slot}>
        {onBack && <IconButton glyph="back" onPress={onBack} accessibilityLabel={t('reader.back')} />}
      </View>

      <View style={s.titleWrap}>
        <Text numberOfLines={1} ellipsizeMode="tail" style={s.title}>
          {title}
        </Text>
      </View>

      <Text style={[s.slot, s.progress]}>{`${Math.round(progress)}%`}</Text>
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
          paddingHorizontal: spacing.screenX,
          gap: spacing.md,
        },
        /** Fixed on both sides — see the header on why the title stays put. */
        slot: { width: SLOT, flexShrink: 0 },

        titleWrap: { flex: 1, minWidth: 0, alignItems: 'center' },
        title: {
          maxWidth: '70%',
          // DESIGN.md's header-title size and weight, in the **JP** face — a
          // book title here is Japanese far more often than not, and
          // `headerTitle` names the Latin cut. `displayKanji` is the Medium cut
          // of the same family; only the family is borrowed from it.
          fontFamily: type.displayKanji.fontFamily,
          fontSize: type.headerTitle.fontSize,
          lineHeight: type.headerTitle.lineHeight,
          fontWeight: '500',
          color: p.ink,
        },
        progress: {
          ...type.monoMeta,
          color: p.muted,
          textAlign: 'right',
          fontVariant: ['tabular-nums'],
        },
      }),
    [p],
  );
}

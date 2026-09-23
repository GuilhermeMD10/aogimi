import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Touchable } from '@/shared/components/Touchable';
import { MoreDotsIcon } from '@/shared/icons/dots';
import { usePalette, radius, type, type Palette } from '@/theme';
import { useT } from '@/lib/i18n/I18nContext';
import type { BookRecord } from '../../types';
import { isPendingBookId } from '../../lib/bookPush';
import { SyncPill, type SyncPillState } from './SyncPill';
import { BookCover } from './BookCover';

/** The three overlays on a cover, all 6pt in from their corner so the badges
 *  line up with each other however tall the artwork turns out to be. */
const OVERLAY_INSET = 6;
/** `Library.dc.html`'s more-button: a 24pt circle with three 2.5pt dots. */
const MORE = 24;
const MORE_DOT = 2.5;

function deriveSyncState(
  book: BookRecord,
  hasFile: boolean,
  sessionPending: boolean,
): SyncPillState {
  if (!hasFile) return 'toImport';
  if (isPendingBookId(book.id)) return 'unsynced';
  // The book is synced as a record on the backend, but had a backend
  // error during a reader session — local writes are queued until the
  // next manual sync. Show as UNSYNCED so the user knows there's
  // something to push.
  if (sessionPending) return 'unsynced';
  return 'synced';
}

/**
 * One tile on the shelf: cover, title, author and percentage.
 *
 * ── Three things sit on the cover, and each corner means something ─────────
 * `…` **top-left**, sync badge top-right, format chip bottom-left — the
 * arrangement `Library.dc.html` draws. The more-button used to sit in the meta
 * row under the title, where it competed with the author line for width and
 * pushed the percentage around; on the cover it is out of the text's way and
 * the same distance from the corner as the badge opposite it. Its ground is the
 * scrim rather than glass, because it lands on artwork whose colours are the
 * publisher's, not the palette's — white dots on a dark wash is the one pairing
 * that reads over every cover.
 *
 * The **sync badge and the format chip are unchanged** by the redesign: the
 * badge is the app's sync vocabulary (and taps to explain itself) and the chip
 * is how a reader tells a PDF from an EPUB before opening it, which matters
 * most for the cross-device records that show a glyph placeholder instead of
 * artwork.
 */
export function BookGridItem({
  book,
  hasFile = true,
  sessionPending = false,
  onPress,
  onMore,
}: {
  book: BookRecord;
  hasFile?: boolean;
  /** When true, render as UNSYNCED — used for synced books whose
   *  reader session hit a backend error. */
  sessionPending?: boolean;
  onPress?: () => void;
  onMore?: () => void;
}) {
  const p = usePalette();
  const t = useT();
  const s = useStyles(p);
  const isPdf = book.filename.toLowerCase().endsWith('.pdf');
  const syncState = deriveSyncState(book, hasFile, sessionPending);

  return (
    <Touchable minTarget={false} onPress={onPress} style={s.root}>
      <View style={s.coverWrap}>
        <BookCover
          title={book.title}
          coverColor={book.cover_color}
          filename={hasFile ? book.filename : undefined}
          aspectRatio={3 / 4}
          cornerRadius={radius.control}
          style={{ ...s.cover, opacity: hasFile ? 1 : 0.45 }}
        />

        {onMore && (
          <Touchable
            minTarget={false}
            hitSlop={8}
            onPress={onMore}
            accessibilityRole="button"
            accessibilityLabel={t('library.moreActions', { title: book.title })}
            style={s.more}
          >
            <MoreDotsIcon size={MORE_DOT} gap={2} color="#FFFFFF" />
          </Touchable>
        )}

        <View style={s.syncSlot}>
          <SyncPill state={syncState} />
        </View>

        <View style={s.formatChip}>
          <Text allowFontScaling={false} style={s.formatChipText}>
            {isPdf ? 'PDF' : 'EPUB'}
          </Text>
        </View>
      </View>

      <Text style={s.title} numberOfLines={2}>
        {book.title}
      </Text>

      <View style={s.metaRow}>
        <Text style={s.author} numberOfLines={1}>
          {book.author || '—'}
        </Text>
        <Text style={s.pct}>{`${Math.round(book.progress)}%`}</Text>
      </View>

      {!hasFile && (
        <Text style={s.missing} numberOfLines={1}>
          {t('library.notOnDevice')}
        </Text>
      )}
    </Touchable>
  );
}

function useStyles(p: Palette) {
  return useMemo(
    () =>
      StyleSheet.create({
        root: { flex: 1, gap: 6 },
        coverWrap: { position: 'relative' },
        cover: { width: '100%', borderWidth: 1, borderColor: p.tintA },

        more: {
          position: 'absolute',
          top: OVERLAY_INSET,
          left: OVERLAY_INSET,
          width: MORE,
          height: MORE,
          // A circle, by definition — half its own box, not a token radius.
          borderRadius: MORE / 2,
          // The scrim, not glass: this lands on the publisher's artwork.
          backgroundColor: p.scrim,
          alignItems: 'center',
          justifyContent: 'center',
        },
        syncSlot: { position: 'absolute', top: OVERLAY_INSET, right: OVERLAY_INSET },

        formatChip: {
          position: 'absolute',
          bottom: OVERLAY_INSET,
          left: OVERLAY_INSET,
          paddingHorizontal: 6,
          paddingVertical: 1,
          borderRadius: radius.chip,
          backgroundColor: p.scrim,
        },
        formatChipText: {
          fontFamily: type.eyebrow.fontFamily,
          fontSize: 9,
          fontWeight: '500',
          lineHeight: 13,
          letterSpacing: 0.6,
          // Same reason as the more-button's dots: it sits on artwork.
          color: '#FFFFFF',
        },

        title: {
          fontFamily: type.titleKanji.fontFamily,
          fontSize: 13,
          fontWeight: '700',
          lineHeight: 18,
          color: p.ink,
        },
        metaRow: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 6,
        },
        author: { ...type.monoMeta, fontFamily: type.bodySm.fontFamily, color: p.faint, flexShrink: 1 },
        pct: { ...type.monoMeta, fontFamily: type.headlineMd.fontFamily, color: p.accent },
        missing: { ...type.labelInterval, color: p.faint, fontStyle: 'italic' },
      }),
    [p],
  );
}

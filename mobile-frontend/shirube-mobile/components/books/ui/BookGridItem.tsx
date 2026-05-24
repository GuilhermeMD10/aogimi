import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/theme/ThemeContext';
import { fontFamily, fontSize, radius } from '@/theme/tokens';
import type { BookRecord } from '../types';
import { isPendingBookId } from '../utils/bookPush';
import { SyncPill, type SyncPillState } from './SyncPill';
import { BookCover } from './BookCover';

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
  const c = useColors();
  const isPdf = book.filename.toLowerCase().endsWith('.pdf');
  const syncState = deriveSyncState(book, hasFile, sessionPending);
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.root, { opacity: pressed ? 0.85 : 1 }]}
    >
      <View style={styles.coverWrap}>
        <BookCover
          title={book.title}
          coverColor={book.cover_color}
          filename={hasFile ? book.filename : undefined}
          aspectRatio={3 / 4}
          cornerRadius={radius.md}
          style={{ ...styles.cover, opacity: hasFile ? 1 : 0.45 }}
        />
        <View style={styles.syncPillSlot}>
          <SyncPill state={syncState} onCover />
        </View>
        {/* Small format chip in the bottom-left corner of the cover so
            users can tell PDF from EPUB at a glance, especially for
            cross-device records that show the swatch placeholder. */}
        <View
          style={[
            styles.formatChip,
            { backgroundColor: c.bgElev, borderColor: c.borderStrong },
          ]}
        >
          <Text style={[styles.formatChipText, { color: c.fgMuted }]}>
            {isPdf ? 'PDF' : 'EPUB'}
          </Text>
        </View>
      </View>
      <Text style={[styles.title, { color: c.fg }]} numberOfLines={2}>
        {book.title}
      </Text>
      <View style={styles.metaRow}>
        <Text style={[styles.meta, { color: c.fgMuted }]} numberOfLines={1}>
          {book.author ? `${book.author} · ` : ''}{book.progress}%
        </Text>
        {onMore && (
          <Pressable
            onPress={onMore}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={`More actions for ${book.title}`}
            style={({ pressed }) => [
              styles.moreBtn,
              { borderColor: c.border, opacity: pressed ? 0.55 : 1 },
            ]}
          >
            <Text style={[styles.moreGlyph, { color: c.fgMuted }]}>⋯</Text>
          </Pressable>
        )}
      </View>
      {!hasFile && (
        <Text style={[styles.missing, { color: c.fgSubtle }]} numberOfLines={1}>
          Not on this device
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  coverWrap: { position: 'relative' },
  cover: {
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 4,
  },
  syncPillSlot: {
    position: 'absolute',
    top: 6,
    right: 6,
  },
  formatChip: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: StyleSheet.hairlineWidth,
  },
  formatChipText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  title: {
    fontFamily: fontFamily.jp,
    fontSize: fontSize.sm + 1,
    fontWeight: '500',
    marginTop: 8,
    lineHeight: 18,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
    gap: 6,
  },
  meta: {
    flexShrink: 1,
    fontSize: fontSize.xs,
  },
  moreBtn: {
    width: 26,
    height: 22,
    borderRadius: 11,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreGlyph: {
    fontSize: 14,
    lineHeight: 14,
    fontWeight: '600',
    marginTop: -3,
  },
  missing: {
    fontSize: fontSize.xs - 1,
    fontStyle: 'italic',
    marginTop: 2,
  },
});

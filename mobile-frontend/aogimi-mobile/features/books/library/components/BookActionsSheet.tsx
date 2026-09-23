import { useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { Touchable, BottomSheet, Button, Glass, TextField } from '@/shared/components';
import { usePalette, spacing, type, type Palette } from '@/theme';
import { useT } from '@/lib/i18n/I18nContext';
import {
  deleteBook,
  updateBookTitle,
  deleteBookFile,
  evictBookCache,
  wipeBookLocalState,
  clearLocalProgress,
  removeCachedBook,
  isPendingBookId,
  syncOneBookOnDemand,
} from '../../lib';
import { useAuth } from '@/features/auth/providers/AuthContext';
import type { BookRecord } from '../../types';

type Props = {
  book: BookRecord | null;
  onDismiss: () => void;
  onChanged: () => void;
};

/** DESIGN.md's "Menu row (popover)": 56pt tall with a 40pt circular icon
 *  plate, rows separated by a hairline. */
const ROW_H = 56;
const PLATE = 40;

/**
 * Per-book actions, shown from the `…` button on a shelf tile: sync now,
 * rename, delete.
 *
 * Two modes in one sheet — a menu and an inline rename form — rather than a
 * second sheet over the first, because `BottomSheet` is a `Modal` and iOS
 * presents one modal per view controller (see `DictDrawer`). Swapping the
 * sheet's contents is the arrangement that works.
 *
 * Styled as DESIGN.md's popover menu: 56pt rows, a 40pt Tier 1 icon plate per
 * row, and a hairline between them. The destructive row colours its glyph and
 * its label with `danger` and nothing else does, so "delete" is legible before
 * it is read.
 */
export function BookActionsSheet({ book, onDismiss, onChanged }: Props) {
  const p = usePalette();
  const s = useStyles(p);
  const t = useT();
  const { user, status } = useAuth();
  const cannotSync = status !== 'signed-in';
  const [mode, setMode] = useState<'menu' | 'rename'>('menu');
  const [draftTitle, setDraftTitle] = useState('');
  const [busy, setBusy] = useState(false);

  // Reset to the menu view + seed the rename field every time a new book
  // is selected. Without this, reopening the sheet for a different book
  // would briefly show the previous book's rename draft.
  useEffect(() => {
    if (!book) return;
    setMode('menu');
    setDraftTitle(book.title);
  }, [book]);

  const visible = book !== null;

  const handleRenameSubmit = async () => {
    if (!book || busy) return;
    const trimmed = draftTitle.trim();
    if (!trimmed) return;
    if (trimmed === book.title) {
      onDismiss();
      return;
    }
    setBusy(true);
    try {
      await updateBookTitle(book.id, trimmed);
      onChanged();
      onDismiss();
    } catch (err) {
      Alert.alert(
        'Rename failed',
        err instanceof Error ? err.message : 'Please try again.',
      );
    } finally {
      setBusy(false);
    }
  };

  const handleSync = async () => {
    if (!book || !user || busy) return;
    setBusy(true);
    try {
      const result = await syncOneBookOnDemand(user.id, book);
      if (result.ok) {
        onChanged();
        onDismiss();
      } else {
        Alert.alert(
          'Still pending',
          'Couldn’t reach the server. The book stays on this device — try again when you’re back online.',
        );
      }
    } catch (err) {
      Alert.alert(
        'Sync failed',
        err instanceof Error ? err.message : 'Please try again.',
      );
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = () => {
    if (!book || busy) return;
    Alert.alert(
      'Delete book?',
      'This removes the book and all reading progress from your account, and deletes the local copy on this device.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setBusy(true);
            try {
              // A pending book has no backend row yet — its id is the
              // synthetic `pending:<filename>` — so there is nothing to
              // DELETE; it is removed by the local cleanup alone.
              if (!isPendingBookId(book.id)) await deleteBook(book.id);
              // Local cleanup, all best-effort. Every chunk is independent —
              // a failure in one shouldn't stop the others.
              //
              //   1. The .epub / .pdf file itself
              //   2. Manga page cache (cache/manga-pages/<bookId>) + LRU
              //      index entry + session handle
              //   3. Everything keyed by filename — reader_book_ row,
              //      extracted cover, sync-map entry (wipeBookLocalState)
              //   4. Optimistic progress patch from the back-press cache
              //   5. The synced-book cache entry (+ its session-pending
              //      flag), so an offline library doesn't keep the tile
              try { deleteBookFile(book.filename); } catch { /* */ }
              try { await evictBookCache(book.id); } catch { /* */ }
              try { await wipeBookLocalState(book.filename); } catch { /* */ }
              clearLocalProgress(book.id);
              try { await removeCachedBook(book.id); } catch { /* */ }
              onChanged();
              onDismiss();
            } catch (err) {
              Alert.alert(
                'Delete failed',
                err instanceof Error ? err.message : 'Please try again.',
              );
            } finally {
              setBusy(false);
            }
          },
        },
      ],
    );
  };

  return (
    <BottomSheet visible={visible} onDismiss={onDismiss} heightRatio={0.42}>
      <View style={s.host}>
        <View style={s.header}>
          <Text style={s.eyebrow}>{t('library.yourBooks')}</Text>
          <Text style={s.title} numberOfLines={1} ellipsizeMode="tail">
            {book?.title ?? ''}
          </Text>
        </View>

        {mode === 'menu' ? (
          <View>
            {/* Sync-now is hidden for guests — no account to push to. */}
            {!cannotSync && (
              <MenuRow
                icon="repeat"
                label={t('library.actions.syncNow')}
                onPress={handleSync}
                disabled={busy}
              />
            )}
            <MenuRow
              icon="edit-2"
              label={t('library.actions.rename')}
              onPress={() => setMode('rename')}
              disabled={busy}
              divided={!cannotSync}
            />
            <MenuRow
              icon="trash-2"
              label={t('library.actions.delete')}
              onPress={handleDelete}
              disabled={busy}
              destructive
              divided
            />
          </View>
        ) : (
          <View style={s.rename}>
            <TextField
              label={t('library.actions.rename')}
              value={draftTitle}
              onChangeText={setDraftTitle}
              placeholder={t('library.actions.titlePlaceholder')}
              japanese
              autoFocus
              editable={!busy}
              returnKeyType="done"
              onSubmitEditing={handleRenameSubmit}
            />
            <View style={s.renameActions}>
              <Button
                label={t('common.cancel')}
                variant="secondary"
                onPress={() => setMode('menu')}
                disabled={busy}
                style={s.flex}
              />
              <Button
                label={t('common.save')}
                onPress={handleRenameSubmit}
                loading={busy}
                disabled={draftTitle.trim().length === 0}
                style={s.flex}
              />
            </View>
          </View>
        )}
      </View>
    </BottomSheet>
  );
}

function MenuRow({
  icon,
  label,
  onPress,
  disabled,
  destructive,
  divided,
}: {
  icon: React.ComponentProps<typeof Feather>['name'];
  label: string;
  onPress: () => void;
  disabled?: boolean;
  /** Colours the glyph and the label with `danger` together — that pairing is
   *  the whole signal, which is why it is one flag rather than a colour prop. */
  destructive?: boolean;
  /** Hairline above. Off for the first row, so the list has no leading rule. */
  divided?: boolean;
}) {
  const p = usePalette();
  const s = useStyles(p);
  const tint = destructive ? p.danger : p.ink;
  return (
    <Touchable
      onPress={onPress}
      disabled={disabled}
      minTarget={false}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[s.row, divided && s.rowDivided, disabled && s.rowDisabled]}
    >
      <Glass tier={1} radius={PLATE / 2} shadow={false} style={s.plate}>
        <Feather name={icon} size={18} color={tint} />
      </Glass>
      <Text style={[s.rowLabel, { color: tint }]}>{label}</Text>
    </Touchable>
  );
}

function useStyles(p: Palette) {
  return useMemo(
    () =>
      StyleSheet.create({
        host: { paddingHorizontal: spacing.xl, gap: spacing.md },
        header: { gap: spacing.xs },
        eyebrow: { ...type.eyebrow, color: p.faint, textTransform: 'uppercase' },
        title: { ...type.titleKanji, fontSize: 18, lineHeight: 26, color: p.ink },

        row: {
          height: ROW_H,
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.md,
        },
        rowDivided: { borderTopWidth: 1, borderTopColor: p.bdB },
        rowDisabled: { opacity: 0.55 },
        plate: {
          width: PLATE,
          height: PLATE,
          alignItems: 'center',
          justifyContent: 'center',
        },
        rowLabel: { ...type.bodyMd, fontFamily: type.headerTitle.fontFamily },

        rename: { gap: spacing.lg },
        renameActions: { flexDirection: 'row', gap: spacing.sm + 2 },
        flex: { flex: 1 },
      }),
    [p],
  );
}

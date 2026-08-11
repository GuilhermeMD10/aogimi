import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { BottomSheet } from '@/shared/components/BottomSheet';
import { useColors } from '@/theme/ThemeContext';
import { fontFamily, fontSize, radius, spacing } from '@/theme/tokens';
import { deleteBook, updateBookTitle } from '../../lib/booksApi';
import { deleteBookFile } from '../../lib/bookPaths';
import { evictBookCache } from '../../lib/mangaPages';
import { deleteCoverFor } from '../../lib/epubCover';
import { clearBookStorage } from '@/features/books/reader/lib/readerStorage';
import { clearLocalProgress } from '../../lib/booksLocalCache';
import { syncOneBookOnDemand } from '../../lib/bookPush';
import { useAuth } from '@/features/auth/providers/AuthContext';
import type { BookRecord } from '../../types';

type Props = {
  book: BookRecord | null;
  onDismiss: () => void;
  onChanged: () => void;
};

/**
 * Per-book actions menu shown from the `…` button on each library tile.
 * Two affordances: rename (PATCH /api/books/{id}) and delete (DELETE /api
 * /books/{id} + local file cleanup). The sheet has two visual modes — a
 * row of action buttons, and an inline rename form — to avoid stacking
 * nested modals.
 */
export function BookActionsSheet({ book, onDismiss, onChanged }: Props) {
  const c = useColors();
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
      const result = await syncOneBookOnDemand(user.id, {
        id: book.id,
        filename: book.filename,
      });
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
              await deleteBook(book.id);
              // Local cleanup, all best-effort. Every chunk is independent —
              // a failure in one shouldn't stop the others.
              //
              //   1. The .epub / .pdf file itself
              //   2. Extracted EPUB cover (documents/covers/) + memCache
              //   3. Manga page cache (cache/manga-pages/<bookId>) + LRU
              //      index entry + session handle
              //   4. AsyncStorage reader.book.<filename> (lastCfi,
              //      highlights, bookmarks)
              //   5. Optimistic progress patch from the back-press cache
              try { deleteBookFile(book.filename); } catch { /* */ }
              try { deleteCoverFor(book.filename); } catch { /* */ }
              try { await evictBookCache(book.id); } catch { /* */ }
              try { await clearBookStorage(book.filename); } catch { /* */ }
              clearLocalProgress(book.id);
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
    <BottomSheet visible={visible} onDismiss={onDismiss} heightRatio={0.4}>
      <View style={styles.host}>
        <Text
          style={[styles.title, { color: c.fg }]}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {book?.title ?? ''}
        </Text>

        {mode === 'menu' && (
          <View style={styles.menu}>
            {/* Sync-now is hidden for guests — no account to push to. */}
            {!cannotSync && (
              <ActionRow
                label="Sync now"
                onPress={handleSync}
                tint={c.fg}
                border={c.border}
                disabled={busy}
              />
            )}
            <ActionRow
              label="Rename"
              onPress={() => setMode('rename')}
              tint={c.fg}
              border={c.border}
              disabled={busy}
            />
            <ActionRow
              label="Delete"
              onPress={handleDelete}
              tint={c.error ?? '#C53030'}
              border={c.border}
              disabled={busy}
            />
          </View>
        )}

        {mode === 'rename' && (
          <View style={styles.renameWrap}>
            <TextInput
              value={draftTitle}
              onChangeText={setDraftTitle}
              autoFocus
              placeholder="Book title"
              placeholderTextColor={c.fgSubtle}
              style={[
                styles.input,
                { color: c.fg, borderColor: c.border, backgroundColor: c.bgElev },
              ]}
              returnKeyType="done"
              onSubmitEditing={handleRenameSubmit}
              editable={!busy}
            />
            <View style={styles.row}>
              <Pressable
                onPress={() => setMode('menu')}
                disabled={busy}
                style={[
                  styles.btnGhost,
                  { borderColor: c.border, opacity: busy ? 0.55 : 1 },
                ]}
              >
                <Text style={[styles.btnGhostText, { color: c.fgMuted }]}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleRenameSubmit}
                disabled={busy || draftTitle.trim().length === 0}
                style={[
                  styles.btnPrimary,
                  { backgroundColor: c.fg, opacity: busy ? 0.55 : 1 },
                ]}
              >
                {busy ? (
                  <ActivityIndicator size="small" color={c.bg} />
                ) : (
                  <Text style={[styles.btnPrimaryText, { color: c.bg }]}>Save</Text>
                )}
              </Pressable>
            </View>
          </View>
        )}
      </View>
    </BottomSheet>
  );
}

function ActionRow({
  label,
  onPress,
  tint,
  border,
  disabled,
}: {
  label: string;
  onPress: () => void;
  tint: string;
  border: string;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[styles.actionRow, { borderColor: border, opacity: disabled ? 0.55 : 1 }]}
    >
      <Text style={[styles.actionText, { color: tint }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  host: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.md,
  },
  title: {
    fontFamily: fontFamily.jp,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  menu: { gap: 8 },
  actionRow: {
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    alignItems: 'flex-start',
  },
  actionText: {
    fontFamily: fontFamily.ui,
    fontSize: fontSize.md,
    fontWeight: '500',
  },
  renameWrap: { gap: spacing.md },
  input: {
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    fontFamily: fontFamily.jp,
    fontSize: fontSize.md,
  },
  row: { flexDirection: 'row', gap: 10, justifyContent: 'flex-end' },
  btnGhost: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
  },
  btnGhostText: { fontSize: fontSize.sm, fontWeight: '500' },
  btnPrimary: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: radius.md,
    minWidth: 84,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPrimaryText: { fontSize: fontSize.sm, fontWeight: '600' },
});

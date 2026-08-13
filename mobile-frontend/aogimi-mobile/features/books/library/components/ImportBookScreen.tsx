import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Feather from '@expo/vector-icons/Feather';
import { useRouter } from 'expo-router';
import { useColors } from '@/theme/ThemeContext';
import { useAuth } from '@/features/auth/providers/AuthContext';
import { fontFamily, fontSize, radius, spacing } from '@/theme/tokens';
import { Button } from '@/shared/components/Button';
import { useBookRecord } from '../../hooks/useBookRecord';
import { BookCover } from './BookCover';
import { locateBookFile } from '../../lib/locateBookFile';

type Props = { bookId: string };

// Dedicated "import this registered book onto this device" screen.
// Reached from the books page when the user taps a book that exists on
// their account but has no local file yet (the "to import" state).
//
// Deliberately NOT the reader: it shows a static metadata card (cover,
// title, author, saved progress) plus a single Import action. The
// reader chrome (top progress bar etc.) is irrelevant here — there's
// nothing to read until the file is on the device.
export function ImportBookScreen({ bookId }: Props) {
  const c = useColors();
  const router = useRouter();
  const { user } = useAuth();
  const { book, loading, error } = useBookRecord(bookId);
  const [importing, setImporting] = useState(false);

  const isPdf = book?.filename.toLowerCase().endsWith('.pdf');
  const format = isPdf ? 'PDF' : 'EPUB';

  const handleImport = useCallback(async () => {
    if (!book || !user || importing) return;
    setImporting(true);
    try {
      const outcome = await locateBookFile(
        { id: book.id, filename: book.filename, title: book.title },
        user.id,
      );
      if (outcome.status === 'attached') {
        // File is on the device now — straight into the reader.
        router.replace(`/reader/${book.id}`);
      } else if (outcome.status === 'rejected') {
        Alert.alert("Doesn't match", outcome.message);
      }
      // 'canceled' → user backed out of the picker; do nothing.
    } finally {
      setImporting(false);
    }
  }, [book, user, importing, router]);

  if (loading) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: c.bg }]} edges={['top']}>
        <View style={styles.centered}>
          <ActivityIndicator color={c.fg} />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !book) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: c.bg }]} edges={['top']}>
        <View style={styles.topBar}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <Feather name="chevron-left" size={26} color={c.fg} />
          </Pressable>
        </View>
        <View style={styles.centered}>
          <Text style={{ color: c.fg, fontSize: fontSize.md }}>{error ?? 'Book not found'}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: c.bg }]} edges={['top']}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Feather name="chevron-left" size={26} color={c.fg} />
        </Pressable>
      </View>

      <View style={styles.centered}>
        <View style={[styles.card, { backgroundColor: c.bgElev, borderColor: c.border }]}>
          <View style={styles.coverWrap}>
            <BookCover
              title={book.title}
              coverColor={book.cover_color}
              width={140}
              aspectRatio={3 / 4}
              cornerRadius={radius.md}
            />
          </View>

          <Text style={[styles.title, { color: c.fg }]} numberOfLines={3}>
            {book.title}
          </Text>
          {book.author.length > 0 && (
            <Text style={[styles.author, { color: c.fgMuted }]} numberOfLines={1}>
              {book.author}
            </Text>
          )}

          <View style={styles.metaRow}>
            <View style={[styles.chip, { borderColor: c.border }]}>
              <Text style={[styles.chipText, { color: c.fgMuted }]}>{format}</Text>
            </View>
            <Text style={[styles.progress, { color: c.fgSubtle }]}>
              {book.progress}% read
            </Text>
          </View>

          <Text style={[styles.body, { color: c.fgMuted }]}>
            This book is on your account from another device. Import the {format} file
            here to start reading — your saved progress carries over.
          </Text>

          <Button
            label={importing ? 'Importing…' : `Import ${format}`}
            onPress={handleImport}
            loading={importing}
            disabled={importing}
            full
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    padding: spacing.xl,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    gap: spacing.sm,
  },
  coverWrap: { marginBottom: spacing.md },
  title: {
    fontFamily: fontFamily.displayBold,
    fontSize: 20,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  author: { fontSize: fontSize.sm, textAlign: 'center' },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: 2,
    marginBottom: spacing.sm,
  },
  chip: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  chipText: { fontSize: 9, fontWeight: '700', letterSpacing: 0.6 },
  progress: { fontSize: fontSize.xs + 1, fontVariant: ['tabular-nums'] },
  body: {
    fontSize: fontSize.sm,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
});

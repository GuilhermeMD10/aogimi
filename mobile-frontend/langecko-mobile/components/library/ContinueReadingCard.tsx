import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/theme/ThemeContext';
import { useT } from '@/lib/i18n/I18nContext';
import { fontFamily, fontSize, radius } from '@/theme/tokens';
import { formatRelativeTime } from '@/lib/relativeTime';
import type { BookRecord } from '@/lib/types';
import { BookCover } from './BookCover';

export function ContinueReadingCard({
  book,
  onPress,
}: {
  book: BookRecord;
  onPress?: () => void;
}) {
  const c = useColors();
  const t = useT();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: c.bgElev, borderColor: c.border, opacity: pressed ? 0.9 : 1 },
      ]}
    >
      <Text style={[styles.kicker, { color: c.fgMuted }]}>
        {t('library.continueReading')}
      </Text>
      <View style={styles.row}>
        <BookCover
          title={book.title}
          coverColor={book.cover_color}
          width={64}
          height={88}
          cornerRadius={radius.sm}
        />
        <View style={styles.meta}>
          <Text style={[styles.title, { color: c.fg }]} numberOfLines={1}>
            {book.title}
          </Text>
          <Text style={[styles.author, { color: c.fgMuted }]} numberOfLines={1}>
            {book.author || '—'}
          </Text>
          <View style={[styles.progressTrack, { backgroundColor: c.bgSunken }]}>
            <View
              style={[
                styles.progressFill,
                { backgroundColor: c.fg, width: `${Math.max(0, Math.min(100, book.progress))}%` },
              ]}
            />
          </View>
          <Text style={[styles.progressLabel, { color: c.fgSubtle }]}>
            {book.progress}% · {formatRelativeTime(book.last_read_at)}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 18,
  },
  kicker: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  row: { flexDirection: 'row', gap: 14, marginTop: 10, alignItems: 'center' },
  meta: { flex: 1, minWidth: 0 },
  title: { fontFamily: fontFamily.jp, fontSize: fontSize.xl, fontWeight: '500' },
  author: { fontSize: fontSize.sm, marginTop: 2 },
  progressTrack: {
    height: 3,
    borderRadius: 99,
    marginTop: 10,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 99 },
  progressLabel: {
    fontSize: fontSize.xs,
    marginTop: 5,
    fontVariant: ['tabular-nums'],
  },
});

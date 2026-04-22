import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/theme/ThemeContext';
import { fontFamily, fontSize, radius } from '@/theme/tokens';
import type { BookRecord } from '@/lib/types';
import { BookCover } from './BookCover';

export function BookGridItem({
  book,
  onPress,
}: {
  book: BookRecord;
  onPress?: () => void;
}) {
  const c = useColors();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.root, { opacity: pressed ? 0.85 : 1 }]}
    >
      <BookCover
        title={book.title}
        coverColor={book.cover_color}
        aspectRatio={3 / 4}
        cornerRadius={radius.md}
        style={styles.cover}
      />
      <Text style={[styles.title, { color: c.fg }]} numberOfLines={2}>
        {book.title}
      </Text>
      <Text style={[styles.meta, { color: c.fgMuted }]} numberOfLines={1}>
        {book.author ? `${book.author} · ` : ''}{book.progress}%
      </Text>
      <View />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  cover: {
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 4,
  },
  title: {
    fontFamily: fontFamily.jp,
    fontSize: fontSize.sm + 1,
    fontWeight: '500',
    marginTop: 8,
    lineHeight: 18,
  },
  meta: {
    fontSize: fontSize.xs,
    marginTop: 2,
  },
});

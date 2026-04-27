import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/theme/ThemeContext';
import { fontFamily, fontSize, radius } from '@/theme/tokens';
import type { BookRecord } from '@/lib/types';
import { BookCover } from './BookCover';

export function BookGridItem({
  book,
  hasFile = true,
  onPress,
}: {
  book: BookRecord;
  hasFile?: boolean;
  onPress?: () => void;
}) {
  const c = useColors();
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
        {!hasFile && (
          <View
            style={[
              styles.badge,
              { backgroundColor: c.bgElev, borderColor: c.borderStrong },
            ]}
          >
            <Text style={[styles.badgeText, { color: c.fgMuted }]}>⬇</Text>
          </View>
        )}
      </View>
      <Text style={[styles.title, { color: c.fg }]} numberOfLines={2}>
        {book.title}
      </Text>
      <Text style={[styles.meta, { color: c.fgMuted }]} numberOfLines={1}>
        {book.author ? `${book.author} · ` : ''}{book.progress}%
      </Text>
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
  badge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontSize: 12, lineHeight: 14 },
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
  missing: {
    fontSize: fontSize.xs - 1,
    fontStyle: 'italic',
    marginTop: 2,
  },
});

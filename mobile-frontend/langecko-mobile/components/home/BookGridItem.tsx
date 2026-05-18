import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/theme/ThemeContext';
import { fontFamily, fontSize, radius } from '@/theme/tokens';
import type { BookRecord } from '@/lib/types';
import { BookCover } from './BookCover';

export function BookGridItem({
  book,
  hasFile = true,
  onPress,
  onMore,
}: {
  book: BookRecord;
  hasFile?: boolean;
  onPress?: () => void;
  onMore?: () => void;
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

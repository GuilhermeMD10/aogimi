import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/theme/ThemeContext';
import { fontSize, spacing } from '@/theme/tokens';

type Props = {
  chapterLabel: string;
  progress: number; // 0-100
  bookmarked?: boolean;
  onBack?: () => void;
  onToggleBookmark?: () => void;
};

export function ReaderTopBar({
  chapterLabel,
  progress,
  bookmarked,
  onBack,
  onToggleBookmark,
}: Props) {
  const c = useColors();
  return (
    <View style={styles.row}>
      <Pressable onPress={onBack} hitSlop={10} style={styles.iconBtn}>
        <Text style={[styles.chevron, { color: c.fg }]}>‹</Text>
      </Pressable>

      <View style={styles.middle}>
        <View style={[styles.track, { backgroundColor: c.bgSunken }]}>
          <View
            style={[
              styles.fill,
              { backgroundColor: c.fg, width: `${Math.max(0, Math.min(100, progress))}%` },
            ]}
          />
        </View>
        <View style={styles.labelRow}>
          <Text style={[styles.labelText, { color: c.fgSubtle }]}>{chapterLabel}</Text>
          <Text style={[styles.labelText, { color: c.fgSubtle }]}>{Math.round(progress)}%</Text>
        </View>
      </View>

      <Pressable
        onPress={onToggleBookmark}
        hitSlop={8}
        style={[styles.iconBtn, { backgroundColor: c.bgElev }]}
      >
        <Text style={[styles.bookmark, { color: bookmarked ? c.accent : c.fg }]}>
          {bookmarked ? '●' : '○'}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: 4,
    paddingBottom: 10,
  },
  iconBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chevron: { fontSize: 28, lineHeight: 28, fontWeight: '300' },
  bookmark: { fontSize: 14 },
  middle: { flex: 1 },
  track: { height: 2, borderRadius: 99, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 99 },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  labelText: { fontSize: fontSize.xs - 1, fontVariant: ['tabular-nums'] },
});

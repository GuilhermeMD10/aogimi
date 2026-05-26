import { StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/theme/ThemeContext';
import { fontFamily } from '@/theme/tokens';

// Top-edge chrome for the reader page. Shows the book title and reading
// progress. Back navigation lives in the floating bottom-left chevron
// (FloatingBackButton) rather than here.

type Props = {
  title: string;
  progress: number; // 0..100
};

export function ReaderTopBar({ title, progress }: Props) {
  const c = useColors();
  return (
    <View pointerEvents="box-none" style={styles.row}>
      <Text
        numberOfLines={1}
        ellipsizeMode="tail"
        style={[styles.title, { color: c.fg, fontFamily: fontFamily.jp }]}
      >
        {title}
      </Text>
      <Text
        style={[styles.progress, { color: c.fgMuted, fontVariant: ['tabular-nums'] }]}
      >
        {Math.round(progress)}%
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 10,
    gap: 12,
  },
  title: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  progress: {
    fontSize: 12,
  },
});

import { StyleSheet, Text, View } from 'react-native';
import { Touchable } from '@/shared/components/Touchable';
import Feather from '@expo/vector-icons/Feather';
import { useColors } from '@/theme/ThemeContext';
import { fontFamily } from '@/theme/tokens';

// Top-edge chrome for the reader page: leave the book, the title, and how far
// through it you are.
//
// Back navigation lives here, at the top left, where leaving a screen lives
// everywhere else in the app. It has been two other places: a chevron
// floating over the page, then a control inside the expanded dock -- which
// made leaving a book a two-step move (open the dock, then press back) for
// something that is not a reading control at all.

type Props = {
  title: string;
  progress: number; // 0..100
  /** Leave the book. Omitted by callers that have no library to go back to. */
  onBack?: () => void;
};

export function ReaderTopBar({ title, progress, onBack }: Props) {
  const c = useColors();
  return (
    <View pointerEvents="box-none" style={styles.row}>
      {onBack && (
        <Touchable
          minTarget={false}
          hitSlop={12}
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel="Back to library"
          style={styles.back}
        >
          <Feather name="chevron-left" size={22} color={c.fg} />
        </Touchable>
      )}
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
  // Pulled left of the row's own padding so the chevron's glyph lines up with
  // the text below it rather than sitting inset from everything else.
  back: {
    marginLeft: -6,
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
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

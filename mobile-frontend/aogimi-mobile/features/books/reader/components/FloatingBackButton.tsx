import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/theme/ThemeContext';

type Props = {
  onPress?: () => void;
  /** When false, the button is not rendered. */
  visible?: boolean;
};

/**
 * Floating round chevron pinned to the bottom-left corner. Used for both the
 * text reader and manga reader. Hidden outright when `visible` is false (which
 * is how the reader clears the dock area as the user expands the bottom toolbar
 * or panes).
 *
 * **Strip-to-basics 2026-08-10:** this used to fade + slide on an
 * `Animated.Value` and carried a drop shadow. Both are gone — it appears and
 * disappears instantly. The behaviour is unchanged; only the transition went.
 */
export function FloatingBackButton({ onPress, visible = true }: Props) {
  const c = useColors();
  const insets = useSafeAreaInsets();

  if (!visible) return null;

  return (
    <View
      pointerEvents="box-none"
      style={[styles.host, { bottom: insets.bottom + 22, borderColor: c.borderStrong }]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Back to library"
        onPress={onPress}
        hitSlop={12}
        style={styles.pressable}
      >
        <Text style={styles.chevron}>‹</Text>
      </Pressable>
    </View>
  );
}

const SIZE = 38;

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    bottom: 22,
    left: 14,
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    borderWidth: StyleSheet.hairlineWidth,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    zIndex: 10,
  },
  pressable: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chevron: {
    fontSize: 24,
    lineHeight: 26,
    fontWeight: '300',
    color: 'black',
  },
});

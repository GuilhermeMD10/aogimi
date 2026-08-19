import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/theme/ThemeContext';
import { palette } from '@/theme/tokens';

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
 * No transition and no shadow: it appears and disappears instantly.
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
    // Tokens rather than the `#FFFFFF` / `'black'` literals this carried: the
    // pair was already light-on-dark by luck, and now it says so.
    backgroundColor: palette.bg,
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
    color: palette.ink,
  },
});

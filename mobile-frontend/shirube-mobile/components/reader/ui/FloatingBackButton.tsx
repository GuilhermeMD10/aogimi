import { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/theme/ThemeContext';

type Props = {
  onPress?: () => void;
  /** When false, the button fades out + slides down out of the way. */
  visible?: boolean;
};

/**
 * Floating round chevron pinned to the bottom-left corner. Used for both
 * the text reader and manga reader. Fades + slides down when `visible` is
 * false (used to clear the dock area when the user expands the bottom
 * toolbar / panes).
 */
export function FloatingBackButton({ onPress, visible = true }: Props) {
  const c = useColors();
  const insets = useSafeAreaInsets();

  const anim = useRef(new Animated.Value(visible ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(anim, {
      toValue: visible ? 1 : 0,
      duration: 50,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [visible, anim]);

  return (
    <Animated.View
      pointerEvents={visible ? 'box-none' : 'none'}
      style={[
        styles.host,
        {
          bottom: insets.bottom + 22,
          borderColor: c.borderStrong,
          opacity: anim,
          transform: [
            {
              translateY: anim.interpolate({
                inputRange: [0, 1],
                outputRange: [24, 0],
              }),
            },
          ],
        },
      ]}
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
    </Animated.View>
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 8,
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

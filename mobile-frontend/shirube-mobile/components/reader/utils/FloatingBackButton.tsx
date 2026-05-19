import { Pressable, StyleSheet, Text } from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/theme/ThemeContext';

type Props = {
  onPress?: () => void;
};

/**
 * Floating round chevron used in place of the chrome top bar for manga
 * reading. Sits above the page with a blurred backdrop, hairline border,
 * and soft shadow so it reads on both light and dark page art.
 */
export function FloatingBackButton({ onPress }: Props) {
  const c = useColors();
  const insets = useSafeAreaInsets();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Back to library"
      onPress={onPress}
      hitSlop={12}
      style={[
        styles.host,
        {
          top: insets.top + 8,
          borderColor: c.borderStrong,
        },
      ]}
    >
      <BlurView intensity={36} tint="dark" style={styles.blur}>
        <Text style={styles.chevron}>‹</Text>
      </BlurView>
    </Pressable>
  );
}

const SIZE = 40;

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    left: 14,
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 8,
  },
  blur: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chevron: {
    fontSize: 24,
    lineHeight: 26,
    fontWeight: '300',
    color: '#FFFFFF',
  },
});

import { useRef } from 'react';
import {
  Dimensions,
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  View,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColors } from '@/theme/ThemeContext';

type Props = {
  visible: boolean;
  onDismiss: () => void;
  heightRatio?: number;
  children: React.ReactNode;
  contentStyle?: ViewStyle;
};

const SCREEN_H = Dimensions.get('window').height;

// Swipe-to-dismiss tuning. Below the velocity threshold a drag only closes
// when the user has pulled the sheet down past the distance threshold.
const SWIPE_CLOSE_VELOCITY = 0.6;        // px/ms
const SWIPE_CLOSE_DISTANCE_RATIO = 0.3;  // fraction of sheet height

/**
 * The app's bottom sheet.
 *
 * **Strip-to-basics 2026-08-10.** This used to slide up on an
 * `Animated.timing`, fade its backdrop in and out, track the drag with
 * `translateY` and spring back on a short release; it also carried a large drop
 * shadow. All of that is gone — the sheet simply appears and disappears, and the
 * backdrop is a flat scrim.
 *
 * **Swipe-to-dismiss still works** and is unchanged in behaviour: a downward
 * drag on the handle past either threshold closes the sheet. What it no longer
 * does is follow your finger on the way, so there is no visual feedback until it
 * closes. Worth restoring as a single `Animated.Value` on `translateY` when the
 * redesign decides what motion this surface should have.
 */
export function BottomSheet({
  visible,
  onDismiss,
  heightRatio = 0.6,
  children,
  contentStyle,
}: Props) {
  const c = useColors();
  const sheetHeight = Math.round(SCREEN_H * heightRatio);

  // ── Swipe-down on the handle ─────────────────────────────────────────
  // The handle wrapper claims downward drags; upward overdrag is ignored.
  // Release past distance OR velocity threshold dismisses.
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dy) > 4 && gs.dy > 0,
      onPanResponderRelease: (_, gs) => {
        const shouldClose =
          gs.vy > SWIPE_CLOSE_VELOCITY ||
          gs.dy > sheetHeight * SWIPE_CLOSE_DISTANCE_RATIO;
        if (shouldClose) onDismiss();
      },
    }),
  ).current;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={onDismiss}
      statusBarTranslucent
    >
      <View style={styles.root}>
        <View style={styles.backdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onDismiss} />
        </View>

        <View
          style={[
            styles.sheet,
            { height: sheetHeight, backgroundColor: c.bgElev },
            contentStyle,
          ]}
        >
          <View style={styles.handleWrap} {...panResponder.panHandlers}>
            <View style={[styles.handle, { backgroundColor: c.borderStrong }]} />
          </View>
          <SafeAreaView style={styles.content} edges={['bottom']}>
            {children}
          </SafeAreaView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheet: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    overflow: 'hidden',
  },
  handleWrap: {
    paddingTop: 10,
    paddingBottom: 4,
    alignItems: 'center',
  },
  handle: {
    width: 40,
    height: 5,
    borderRadius: 99,
  },
  content: { flex: 1 },
});

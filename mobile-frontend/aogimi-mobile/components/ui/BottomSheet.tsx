import { useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
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

export function BottomSheet({
  visible,
  onDismiss,
  heightRatio = 0.6,
  children,
  contentStyle,
}: Props) {
  const c = useColors();
  const sheetHeight = Math.round(SCREEN_H * heightRatio);
  const translateY = useRef(new Animated.Value(sheetHeight)).current;
  const backdrop = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: 260,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(backdrop, {
          toValue: 1,
          duration: 260,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, translateY, backdrop, sheetHeight]);

  const handleDismiss = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: sheetHeight,
        duration: 200,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(backdrop, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => onDismiss());
  };

  // ── Swipe-down on the handle ─────────────────────────────────────────
  // The handle wrapper claims downward drags; upward overdrag is ignored.
  // Release past distance OR velocity threshold dismisses; otherwise the
  // sheet springs back to rest.
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dy) > 4 && gs.dy > 0,
      onPanResponderMove: (_, gs) => {
        if (gs.dy > 0) translateY.setValue(gs.dy);
      },
      onPanResponderRelease: (_, gs) => {
        const shouldClose =
          gs.vy > SWIPE_CLOSE_VELOCITY ||
          gs.dy > sheetHeight * SWIPE_CLOSE_DISTANCE_RATIO;
        if (shouldClose) {
          handleDismiss();
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 0,
            speed: 16,
          }).start();
        }
      },
      onPanResponderTerminate: () => {
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          bounciness: 0,
          speed: 16,
        }).start();
      },
    }),
  ).current;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={handleDismiss}
      statusBarTranslucent
    >
      <View style={styles.root}>
        <Animated.View
          style={[
            styles.backdrop,
            { opacity: backdrop },
          ]}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={handleDismiss} />
        </Animated.View>

        <Animated.View
          style={[
            styles.sheet,
            {
              height: sheetHeight,
              backgroundColor: c.bgElev,
              transform: [{ translateY }],
            },
            contentStyle,
          ]}
        >
          <View style={styles.handleWrap} {...panResponder.panHandlers}>
            <View style={[styles.handle, { backgroundColor: c.borderStrong }]} />
          </View>
          <SafeAreaView style={styles.content} edges={['bottom']}>
            {children}
          </SafeAreaView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  sheet: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -12 },
    shadowOpacity: 0.15,
    shadowRadius: 40,
    elevation: 20,
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

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Modal,
  PanResponder,
  StyleSheet,
  View,
  type ViewStyle,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PressableBackdrop } from './Touchable';
import {
  usePalette,
  useTheme,
  glassSheet,
  ACCELERATE,
  DECELERATE,
  SHEET_MS,
  SURFACE_MS,
  radius,
} from '@/theme';
import { useReduceMotion } from '@/lib/useReduceMotion';

type Props = {
  visible: boolean;
  onDismiss: () => void;
  heightRatio?: number;
  children: React.ReactNode;
  contentStyle?: ViewStyle;
};

const SCREEN_H = Dimensions.get('window').height;

/** DESIGN.md's grabber: 40 × 4, `rgba(255,255,255,0.25)` — `bdA`. */
const GRABBER_W = 40;
const GRABBER_H = 4;

// Swipe-to-dismiss tuning. Below the velocity threshold a drag only closes
// when the user has pulled the sheet down past the distance threshold.
const SWIPE_CLOSE_VELOCITY = 0.6;        // px/ms
const SWIPE_CLOSE_DISTANCE_RATIO = 0.3;  // fraction of sheet height

/**
 * **The app's bottom sheet** — DESIGN.md's Tier 4 surface: radius 28 on the top
 * corners, a 40×4 grabber, and a scrim with an 8px blur behind it. No edge of
 * its own: see `styles.sheet`.
 *
 * ── It brings its own ground ───────────────────────────────────────────────
 * The fill is `glassSheet`, not `glassTier(4)`. Tier 4 is a *white tint* and a
 * tint needs the sky behind it; a sheet is a `Modal` and can be raised over
 * anything — most sharply over the reader's page, which is white, sepia or
 * near-black at the reader's own choosing. The sheet used to take `bgElev`
 * (a 7% white film), so over the scrim it read as a slightly milkier scrim
 * rather than as a surface. See `theme/glass.ts`.
 *
 * ── It tracks the finger ───────────────────────────────────────────────────
 * A downward drag on the grabber moves the sheet with the hand and releases to
 * either close or spring back. Previously the drag was measured but not drawn,
 * so the sheet stood still under the finger and then vanished — which reads as
 * a glitch rather than as a gesture.
 *
 * ── It leaves the way it arrived ───────────────────────────────────────────
 * The exit is the entrance played backwards — the same 260ms over `ACCELERATE`,
 * the time-reverse of the rise's curve — and the `Modal` is held open until it
 * finishes.
 *
 * The children are **frozen** for the length of it. Several callers reset their
 * form in the same handler that hides the sheet (`FlashcardDrawer`), so the
 * sheet leaves still showing what was in it rather than playing 260ms over a
 * freshly-cleared form. That was the reason the exit used to be instant.
 */
export function BottomSheet({
  visible,
  onDismiss,
  heightRatio = 0.6,
  children,
  contentStyle,
}: Props) {
  const p = usePalette();
  const { themeName } = useTheme();
  const reduceMotion = useReduceMotion();
  const g = useMemo(() => glassSheet(p, themeName === 'night'), [p, themeName]);
  const sheetHeight = Math.round(SCREEN_H * heightRatio);

  // Two values on one transform: `rise` is the entrance (0 closed → 1 open),
  // `drag` is the finger's offset in points. Added rather than multiplexed so
  // a drag that snaps back cannot disturb the entrance, and both stay on the
  // native driver.
  const rise = useRef(new Animated.Value(0)).current;
  const drag = useRef(new Animated.Value(0)).current;

  // The `Modal` outlives `visible` by the length of the exit — a modal whose
  // children unmount on the frame it is told to close has no exit to play.
  const [mounted, setMounted] = useState(visible);
  // Skips the exit on the initial closed render: every sheet in the app mounts
  // hidden, and without this each one would run a 260ms animation from 0 to 0.
  const opened = useRef(visible);

  // The children as they stood while the sheet was open. See the header.
  const frozen = useRef(children);
  useEffect(() => {
    if (visible) frozen.current = children;
  });

  useEffect(() => {
    if (visible) {
      opened.current = true;
      setMounted(true);
      // Reset on the way in, so an open starts from the bottom rather than
      // from wherever the last drag left it.
      drag.setValue(0);
      if (reduceMotion) {
        rise.setValue(1);
        return;
      }
      const anim = Animated.timing(rise, {
        toValue: 1,
        duration: SHEET_MS,
        easing: DECELERATE,
        useNativeDriver: true,
      });
      anim.start();
      return () => anim.stop();
    }

    if (!opened.current) return;
    if (reduceMotion) {
      rise.setValue(0);
      setMounted(false);
      return;
    }
    // `drag` is left where the finger put it: a swipe-dismiss then carries on
    // downwards from there rather than snapping back to finish the trip.
    const anim = Animated.timing(rise, {
      toValue: 0,
      duration: SHEET_MS,
      easing: ACCELERATE,
      useNativeDriver: true,
    });
    anim.start(({ finished }) => {
      if (finished) setMounted(false);
    });
    return () => anim.stop();
  }, [visible, reduceMotion, rise, drag]);

  // ── Swipe-down on the grabber ────────────────────────────────────────
  // Claims downward drags only; upward overdrag is ignored so the sheet cannot
  // be pulled above its own top edge. Release past distance OR velocity
  // dismisses; anything shorter springs back.
  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gs) => gs.dy > 4 && Math.abs(gs.dy) > Math.abs(gs.dx),
      onPanResponderMove: (_, gs) => drag.setValue(Math.max(0, gs.dy)),
      onPanResponderRelease: (_, gs) => {
        const shouldClose =
          gs.vy > SWIPE_CLOSE_VELOCITY || gs.dy > sheetHeight * SWIPE_CLOSE_DISTANCE_RATIO;
        if (shouldClose) {
          onDismiss();
          return;
        }
        Animated.timing(drag, {
          toValue: 0,
          duration: SURFACE_MS,
          easing: DECELERATE,
          useNativeDriver: true,
        }).start();
      },
    }),
  ).current;

  // Memoised because `Animated.add` builds a node in the native animation
  // graph: a fresh one per render would add a node per render and leave the
  // previous one attached.
  const translateY = useMemo(
    () =>
      Animated.add(
        rise.interpolate({ inputRange: [0, 1], outputRange: [sheetHeight, 0] }),
        drag,
      ),
    [rise, drag, sheetHeight],
  );

  return (
    <Modal
      transparent
      visible={mounted}
      animationType="none"
      onRequestClose={onDismiss}
      statusBarTranslucent
    >
      {/* A leaving sheet is not a target: a tap would land on content that is
          already on its way out and fire `onDismiss` a second time. */}
      <View style={styles.root} pointerEvents={visible ? 'auto' : 'none'}>
        {/* The scrim — one value for every sheet and popover, and it fades in
            with the sheet so the page does not snap dark before it arrives. */}
        <Animated.View style={[styles.backdrop, { opacity: rise }]}>
          <BlurView
            intensity={8}
            tint={g.blurTint}
            pointerEvents="none"
            style={StyleSheet.absoluteFill}
          />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: p.scrim }]} />
          {/* No nudge, no haptic — dismissing by tapping away is not contact
              with a control, and a tick here would fire on every stray tap. */}
          <PressableBackdrop style={StyleSheet.absoluteFill} onPress={onDismiss} />
        </Animated.View>

        <Animated.View
          style={[
            styles.sheet,
            {
              height: sheetHeight,
              backgroundColor: g.fill,
              transform: [{ translateY }],
            },
            contentStyle,
          ]}
        >
          <BlurView
            intensity={g.blurIntensity}
            tint={g.blurTint}
            pointerEvents="none"
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.grabberWrap} {...pan.panHandlers}>
            <View style={[styles.grabber, { backgroundColor: p.bdA }]} />
          </View>
          <SafeAreaView style={styles.content} edges={['bottom']}>
            {visible ? children : frozen.current}
          </SafeAreaView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: StyleSheet.absoluteFillObject,
  sheet: {
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    // No border and no specular rim. A sheet is the one surface that arrives
    // already separated from what is under it — the scrim does that work — so
    // the hairline `Glass` draws to lift a card off the canvas only outlines
    // the sheet's edge here.
    //
    // Clips the blur to the rounded corners. The sheet sits against a scrim
    // rather than needing to lift off a canvas, so it loses nothing by having
    // its own drop shadow clipped away.
    overflow: 'hidden',
  },
  grabberWrap: {
    paddingTop: 12,
    paddingBottom: 6,
    alignItems: 'center',
  },
  grabber: {
    width: GRABBER_W,
    height: GRABBER_H,
    borderRadius: GRABBER_H,
  },
  content: { flex: 1 },
});

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { type LayoutChangeEvent, Pressable, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { usePalette, useTheme } from '@/theme/ThemeContext';
import { impactFeedback } from '@/lib/haptics';
import { DockItem, type FeatherName } from './DockItem';
import { layout, lerpLayout, nearestIndex } from './dockGeometry';
import { dockMaterial } from './dockMaterial';

/**
 * The dock's bar — every pixel of it, and every gesture, with no idea that a
 * navigator exists.
 *
 * Split out of `Dock` so the same component can be driven by the tab navigator
 * (see `Dock.tsx`) and by the dev tuning lab (`dockLab/DockLabView`). The dock
 * is the part worth tuning, so the dock is the part that takes the knobs;
 * routing, hiding and the safe-area offset stay with the caller. The two are
 * now the same dock — the lab exists to feel it in isolation, not to compare
 * it against alternatives.
 *
 * ── Behaviour ────────────────────────────────────────────────────────────────
 *   · **Tap a route** — `onSelect`; the dock collapses around it.
 *   · **Hold** (`holdMs`) — opens to every route, and stays open.
 *   · **Double-tap the current circle** — same.
 *   · **Slide** — from anywhere across the row, the highlight tracks the finger
 *     (`haptics.step` per crossing); release selects the highlighted route.
 *
 * ── `open` is controlled ─────────────────────────────────────────────────────
 * The dock asks to open and close; the caller decides. The real dock owns the
 * full-screen backdrop that closes it on an outside tap — not possible from in
 * here.
 *
 * ── `hover` is the frame the selection has not caught up with ────────────────
 * `current` is what the caller says is selected. `hover` is the route the
 * finger has picked but the caller has not confirmed yet: it covers the frames
 * between `onSelect` and the prop coming back changed — without it the dock
 * would snap back onto the old route for a frame — and the slide itself, where
 * the highlight moves before anything is selected. It clears when `current`
 * catches up, or at once if `onSelect` returns `false`.
 *
 * ── One interpolation ────────────────────────────────────────────────────────
 * Every state change is one `t` between two `layout()` results — see
 * `dockGeometry.ts`. Row width, row offset and every item read from that one
 * `frame`, on the UI thread.
 *
 * ── Material ─────────────────────────────────────────────────────────────────
 * Nothing is drawn but the routes themselves. There is no bar and no panel:
 * each mark is its own disc of glass (`dockMaterial`), the current route
 * painted `active` with `activeInk` in it, an open non-current one a tile with
 * `muted`, and a resting one bare glass with `ink` on it. Three inks, three
 * situations; the material itself is one sheet — see `DockItem`.
 */

export type DockSlot = {
  icon: FeatherName;
  label: string;
};

/** How the bar feels under the finger. Two moments, so the lab can pair a
 *  press weight with a slide detent independently. */
export type DockHaptics = {
  /** A route has been touched. Fires on press-in, with the finger. */
  press: () => void;
  /** The slide has crossed into the next route. Fires many times per drag. */
  step: () => void;
};

/**
 * What the dock uses everywhere — the values the tuning lab settled on, kept
 * here rather than in the lab so the real dock and the lab bar cannot drift.
 *
 * Both timings are short and both haptics are soft: the pairing the lab's
 * three-way comparison landed on, brisk to the eye and gentle to the thumb.
 */
export const DOCK_DEFAULTS = {
  /** press-and-hold before the dock opens */
  holdMs: 180,
  /** how long the dock takes to move between two layouts */
  slideMs: 160,
  haptics: {
    press: () => impactFeedback('soft'),
    step: () => impactFeedback('solid'),
  } as DockHaptics,
} as const;

const DOUBLE_TAP_MS = 300;
/** finger travel before a press becomes a slide */
const SLIDE_START = 6;
/** The dock's slide curve, `--dock-glass-slide`. Reanimated's own `Easing`
 *  rather than `theme/motion`'s `DECELERATE`, which is RN's and cannot run as a
 *  worklet — same bezier. */
const EASING = Easing.bezier(0.4, 0, 0.2, 1);

export function DockBar({
  slots,
  current,
  onSelect,
  open,
  onOpenChange,
  holdMs = DOCK_DEFAULTS.holdMs,
  slideMs = DOCK_DEFAULTS.slideMs,
  haptics = DOCK_DEFAULTS.haptics,
}: {
  slots: readonly DockSlot[];
  /** The selected route, as far as the caller is concerned. */
  current: number;
  /** Return `false` to reject the selection — the highlight snaps back. */
  onSelect: (index: number) => boolean | void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  holdMs?: number;
  slideMs?: number;
  haptics?: DockHaptics;
}) {
  const p = usePalette();
  const { themeName } = useTheme();
  const material = useMemo(() => dockMaterial(p, themeName === 'night'), [p, themeName]);
  const { colors } = material;

  const count = slots.length;
  const [hover, setHover] = useState<number | null>(null);
  const shown = hover ?? current;

  useEffect(() => {
    if (hover !== null && hover === current) setHover(null);
  }, [hover, current]);

  /* ── The one interpolated layout every piece of the bar reads from ───────── */
  const start = layout(count, current, false, colors);
  const from = useSharedValue(start);
  const to = useSharedValue(start);
  const t = useSharedValue(1);
  const frame = useDerivedValue(() => lerpLayout(from.value, to.value, t.value));

  useEffect(() => {
    from.value = frame.value; // carry over wherever the last move got to
    to.value = layout(count, shown, open, colors);
    t.value = 0;
    t.value = withTiming(1, { duration: slideMs, easing: EASING });
  }, [count, shown, open, colors, slideMs, from, to, t, frame]);

  const row = useAnimatedStyle(() => ({
    width: frame.value.width,
    height: frame.value.height,
    transform: [{ translateX: frame.value.shift }],
  }));

  /* ── Selecting a route ─────────────────────────────────────────────────────── */
  const go = useCallback(
    (index: number) => {
      onOpenChange(false);
      if (index === current) {
        setHover(null);
        return;
      }
      setHover(onSelect(index) === false ? null : index);
    },
    [current, onSelect, onOpenChange],
  );

  const lastTap = useRef(0);
  const press = useCallback(
    (index: number) => {
      const now = Date.now();
      const isDouble = index === shown && now - lastTap.current < DOUBLE_TAP_MS;
      lastTap.current = now;
      if (isDouble) onOpenChange(true);
      else go(index);
    },
    [shown, go, onOpenChange],
  );

  const expand = useCallback(() => onOpenChange(true), [onOpenChange]);

  /* ── The slide ─────────────────────────────────────────────────────────────
     The finger's x is screen-absolute; the open bar is centred in the host
     (`shift` is 0 when open), so its left edge is `(hostW − openWidth) / 2`.
     That holds only while the host spans the screen from x = 0 — which the real
     dock does, and which the lab is laid out to do. Open geometry does not
     depend on `current`, so it is computed once. */
  const [hostW, setHostW] = useState(0);
  const onHostLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0) setHostW((prev) => (prev === w ? prev : w));
  };
  const openLayout = useMemo(() => layout(count, 0, true, colors), [count, colors]);
  const sliding = useRef(current);

  const slideTo = useCallback(
    (absoluteX: number) => {
      const barLeft = (hostW - openLayout.width) / 2;
      const index = nearestIndex(absoluteX - barLeft, openLayout.items);
      if (index === sliding.current) return;
      sliding.current = index;
      setHover(index);
      haptics.step();
    },
    [hostW, openLayout, haptics],
  );

  const slide = useMemo(
    () =>
      Gesture.Pan()
        .minDistance(SLIDE_START)
        .onStart((e) => {
          sliding.current = shown;
          onOpenChange(true);
          slideTo(e.absoluteX);
        })
        .onUpdate((e) => slideTo(e.absoluteX))
        .onEnd(() => go(sliding.current))
        // Everything it does is React state and haptics, so it lives on JS.
        .runOnJS(true),
    [shown, slideTo, go, onOpenChange],
  );

  return (
    <View style={styles.host} pointerEvents="box-none" onLayout={onHostLayout}>
      <GestureDetector gesture={slide}>
        <Animated.View style={row} accessibilityRole="tablist">
          {/* Holding the row itself, between the marks, opens it too. */}
          <Pressable style={StyleSheet.absoluteFill} onLongPress={expand} delayLongPress={holdMs} />

          {slots.map((slot, index) => (
            <DockItem
              key={index}
              index={index}
              frame={frame}
              material={material}
              icon={slot.icon}
              label={slot.label}
              ink={
                index === shown
                  ? material.ink.active
                  : !open && Math.abs(index - shown) === 1
                    ? material.ink.glass
                    : material.ink.muted
              }
              isCurrent={index === shown}
              onPressIn={haptics.press}
              onPress={() => press(index)}
              onLongPress={expand}
              holdMs={holdMs}
            />
          ))}
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    width: '100%',
    alignItems: 'center',
  },
});

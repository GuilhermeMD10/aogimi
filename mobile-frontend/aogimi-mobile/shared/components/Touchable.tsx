import { useCallback, useMemo, useRef } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  View,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { usePalette, useTheme } from '@/theme/ThemeContext';
import { glassWash } from '@/theme/glass';
import {
  EASE,
  MIN_TARGET,
  PRESS_MS,
  PRESS_SCALE,
  PRESS_TRANSLATE_Y,
  SURFACE_MS,
} from '@/theme/motion';
import { radius as radii } from '@/theme/tokens';
import { pressFeedback } from '@/lib/haptics';
import { useReduceMotion } from '@/lib/useReduceMotion';
import { Sheens } from './Sheens';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * **Every tappable thing in the app.** Use this, not a bare `Pressable`.
 *
 * It exists because the app had two problems that turned out to be one problem.
 * Motion was stripped in the 2026-08-10 pass, so a tap produced no visual
 * response anywhere except the dock; and 55 controls were sized to their glyph
 * and patched with `hitSlop` at five different values. A press that gives no
 * feedback is indistinguishable from a miss, so undersized targets and absent
 * feedback compounded — every control felt smaller than it looked. This fixes
 * both at once, in one place, which is the only way a rule like "44pt minimum"
 * survives 60 files.
 *
 * What it does on press, all ported from the web's `.glass-press`:
 *
 *   · **nudge** — `translateY(1px) scale(0.985)` over `PRESS_MS`, skipped under
 *     the OS's reduce-motion switch exactly as the web skips it under
 *     `prefers-reduced-motion`.
 *   · **haptic** — a light tick on press-*in*, so it lands with the finger.
 *   · **fill** — `surface="glass"` fades to the pressed wash over `SURFACE_MS`.
 *
 * ── The target is the box ──────────────────────────────────────────────────
 * `style` goes on the pressable itself, so the visual box *is* the hit area:
 * put padding **inside** this component, never around it. `MIN_TARGET` is
 * applied as a floor so a small control grows to 44pt instead of being patched
 * with invisible slop. Two escapes, both deliberate:
 *
 *   · `minTarget={false}` — for a pressable that is already large (a card, a
 *     row) or that must not grow (an inline link inside a paragraph).
 *   · `hitSlop` — passed through, for the rare control that genuinely cannot be
 *     44pt. It should be rare; reach for padding first.
 */
export function Touchable({
  children,
  style,
  surface = 'none',
  radius = radii.md,
  nudge = true,
  haptic = true,
  minTarget = true,
  disabled,
  onPressIn,
  onPressOut,
  ...rest
}: Omit<PressableProps, 'style' | 'children'> & {
  children?: React.ReactNode;
  /** Static style only — this component owns the press transform, so a
   *  `({ pressed }) => …` callback has nothing left to express. */
  style?: StyleProp<ViewStyle>;
  /** `glass` draws the frosted wash: fill, hairline, two sheens, specular line.
   *  No live blur — see `theme/glass.ts` for why small controls skip it. */
  surface?: 'none' | 'glass';
  /** Corner radius of the glass layers. Match the caller's own radius. */
  radius?: number;
  /** Off for a control whose position is load-bearing — a sheet's drag handle,
   *  anything absolutely placed against a moving edge. */
  nudge?: boolean;
  /** Off for destructive or repeat-fire controls where a tick per tap is noise. */
  haptic?: boolean;
  /** Off when the 44pt floor would distort the layout. */
  minTarget?: boolean;
}) {
  const p = usePalette();
  const { themeName } = useTheme();
  const reduceMotion = useReduceMotion();
  const glass = useMemo(() => glassWash(p, themeName === 'night'), [p, themeName]);

  // Two values, because they drive different properties: the transform can run
  // on the native driver, an overlay's opacity can too, and keeping them apart
  // lets the nudge be skipped without touching the fill.
  const press = useRef(new Animated.Value(0)).current;
  const fill = useRef(new Animated.Value(0)).current;

  const animate = useCallback(
    (to: number) => {
      Animated.parallel([
        Animated.timing(press, {
          toValue: to,
          duration: PRESS_MS,
          easing: EASE,
          useNativeDriver: true,
        }),
        Animated.timing(fill, {
          toValue: to,
          duration: SURFACE_MS,
          easing: EASE,
          useNativeDriver: true,
        }),
      ]).start();
    },
    [press, fill],
  );

  const handlePressIn = useCallback<NonNullable<PressableProps['onPressIn']>>(
    (e) => {
      if (!disabled) {
        if (haptic) pressFeedback();
        animate(1);
      }
      onPressIn?.(e);
    },
    [disabled, haptic, animate, onPressIn],
  );

  const handlePressOut = useCallback<NonNullable<PressableProps['onPressOut']>>(
    (e) => {
      animate(0);
      onPressOut?.(e);
    },
    [animate, onPressOut],
  );

  // A stable-shape transform: RN 0.83 + Fabric coerces a conditional
  // `undefined` to null between press states and crashes the transform
  // processor, so both entries are always present and reduce-motion flattens
  // their ranges instead of removing them.
  const animatedStyle = {
    transform: [
      {
        translateY: press.interpolate({
          inputRange: [0, 1],
          outputRange: [0, nudge && !reduceMotion ? PRESS_TRANSLATE_Y : 0],
        }),
      },
      {
        scale: press.interpolate({
          inputRange: [0, 1],
          outputRange: [1, nudge && !reduceMotion ? PRESS_SCALE : 1],
        }),
      },
    ],
  };

  return (
    <AnimatedPressable
      {...rest}
      disabled={disabled}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        minTarget && styles.minTarget,
        surface === 'glass' && {
          borderRadius: radius,
          borderWidth: 1,
          borderColor: glass.bd,
          backgroundColor: glass.fill,
          overflow: 'hidden',
        },
        style,
        animatedStyle,
      ]}
    >
      {surface === 'glass' && (
        <>
          {/* The pressed wash, faded in over the idle one rather than swapped:
              `backgroundColor` cannot run on the native driver, `opacity` can. */}
          <Animated.View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: glass.fillPressed, opacity: fill },
            ]}
          />
          <Sheens
            top={glass.sheenTop}
            bottom={glass.sheenBottom}
            lineMid={glass.lineMid}
            lineEdge={glass.lineEdge}
          />
        </>
      )}
      {children}
    </AnimatedPressable>
  );
}

/**
 * A press-dismissable backdrop — the scrim behind a sheet, or the page area a
 * tap should dismiss the keyboard from.
 *
 * Its own component because it is the exception to every rule above: no nudge
 * (it is the whole screen), no haptic (dismissing is not contact with a
 * control), no minimum (it has no intrinsic size), and no accessibility role,
 * since a screen reader reaches the dismiss action through the sheet itself.
 */
export function PressableBackdrop({
  onPress,
  style,
  children,
  accessible = false,
}: {
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
  accessible?: boolean;
}) {
  return (
    <Pressable onPress={onPress} accessible={accessible} style={style}>
      {children ?? <View style={StyleSheet.absoluteFill} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  minTarget: { minWidth: MIN_TARGET, minHeight: MIN_TARGET },
});

import { Pressable, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, type DerivedValue } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import Feather from '@expo/vector-icons/Feather';
import { useTheme } from '@/theme/ThemeContext';
import { type DockFrame, SIZES } from './dockGeometry';

export type FeatherName = React.ComponentProps<typeof Feather>['name'];

/**
 * One route in the dock — a circle of frosted glass, painted over when it is
 * the current route (or while the dock is open) and left bare otherwise. Every
 * visual property reads off the shared `frame`, so it never re-renders for the
 * animation; the one React prop that does change (`ink`) changes on navigation.
 *
 * ── Three layers, in this order ──────────────────────────────────────────────
 *   1. the **host**, which carries the position, the size and the shadow;
 *   2. the **disc** — the blur, clipped to a circle;
 *   3. the **tint**, `frame.bg`, *over* the blur rather than under it. Under
 *      it the current route would come out as frosted vermillion instead of
 *      vermillion; over it, an opaque fill hides the glass it does not need
 *      and a transparent one lets all of it through.
 *
 * The host repeats the tint as its own background. That is not decoration —
 * iOS only builds a `shadowPath` from a view with an opaque background, and
 * without one the shadow is derived from layer alpha, which is not something
 * to depend on. The background is hidden behind the disc either way.
 *
 * ── The shadow is the only ground ────────────────────────────────────────────
 * There is no bar behind these and no border around them. A layer shadow is
 * cast by the layer's shape, so it only says anything while there is a painted
 * circle to cast it: its opacity is `fill`. A glyph sitting on bare glass is
 * shaped like the glyph, so its shadow is the glyph's own `textShadow`.
 *
 * `overflow: 'hidden'` must stay off the host: it sets `masksToBounds`, which
 * clips a layer's own shadow away completely. It belongs on the disc, which is
 * what needs the blur clipped to a circle.
 *
 * ── The glyph is scaled, not resized ─────────────────────────────────────────
 * `Feather`'s `size` is a prop, so animating it would mean re-rendering every
 * frame. It is drawn once at the largest size any state asks for and scaled
 * down from there — to zero for a dot, which has no glyph at all.
 *
 * The press haptic arrives as `onPressIn` rather than being fired in here, so
 * the dock can be given a different weight without this knowing about it.
 *
 * A plain `Pressable`, not `Touchable`: the mark already answers a press by
 * growing into the active circle, and the 44pt floor cannot apply to a 9pt
 * dot. `hitSlop` is half the gap, so neighbouring targets meet without
 * overlapping — an overlap would hand the tap to whichever item is drawn last.
 */
export function DockItem({
  index,
  frame,
  icon,
  label,
  ink,
  isCurrent,
  onPressIn,
  onPress,
  onLongPress,
  holdMs,
}: {
  index: number;
  frame: DerivedValue<DockFrame>;
  icon: FeatherName;
  label: string;
  ink: string;
  isCurrent: boolean;
  onPressIn: () => void;
  onPress: () => void;
  onLongPress: () => void;
  holdMs: number;
}) {
  const { themeName } = useTheme();

  const shape = useAnimatedStyle(() => {
    const item = frame.value.items[index];
    return {
      left: item.x,
      top: (frame.value.height - item.size) / 2,
      width: item.size,
      height: item.size,
      borderRadius: item.size / 2,
      backgroundColor: item.bg,
      opacity: item.opacity,
      // Every length in the shadow is a fraction of the mark casting it.
      shadowRadius: item.size * SHADOW.radius,
      shadowOffset: { width: 0, height: item.size * SHADOW.drop },
      // Only a painted circle casts this one; a glyph casts its own.
      shadowOpacity: item.fill * SHADOW.opacity,
    };
  });

  const disc = useAnimatedStyle(() => ({
    borderRadius: frame.value.items[index].size / 2,
  }));

  const tint = useAnimatedStyle(() => ({
    backgroundColor: frame.value.items[index].bg,
  }));

  const glyph = useAnimatedStyle(() => ({
    transform: [{ scale: frame.value.items[index].glyph / SIZES.icon }],
  }));

  return (
    <Animated.View style={[styles.item, shape]}>
      <Animated.View style={[styles.disc, disc]} pointerEvents="none">
        <BlurView
          intensity={BLUR_INTENSITY}
          tint={themeName === 'night' ? 'dark' : 'light'}
          style={StyleSheet.absoluteFill}
        />
        <Animated.View style={[StyleSheet.absoluteFill, tint]} />
      </Animated.View>

      <Pressable
        style={styles.press}
        onPressIn={onPressIn}
        onPress={onPress}
        onLongPress={onLongPress}
        delayLongPress={holdMs}
        hitSlop={SIZES.gap / 2}
        accessibilityRole="tab"
        accessibilityState={{ selected: isCurrent }}
        accessibilityLabel={label}
      >
        <Animated.View style={glyph}>
          <Feather name={icon} size={SIZES.icon} color={ink} style={styles.glyphShadow} />
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

/** Frosted, not opaque: enough that what is behind a mark stops being readable
 *  through it, little enough that it is obvious something is back there. */
const BLUR_INTENSITY = 45;

/** Fractions of the mark's own diameter, so one set of numbers covers a 60pt
 *  circle and a 9pt dot. Black in both themes: this is a shadow, not a glow,
 *  and on Night it earns its keep against content rather than the canvas. */
const SHADOW = {
  radius: 0.35,
  drop: 0.12,
  opacity: 0.35,
} as const;

const SHADOW_COLOR = '#000';

const styles = StyleSheet.create({
  item: {
    position: 'absolute',
    shadowColor: SHADOW_COLOR,
  },
  disc: {
    ...StyleSheet.absoluteFillObject,
    // The blur is a native view; without this it ignores the radius.
    overflow: 'hidden',
  },
  press: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Scaled by the glyph's own transform, so these are stated at `SIZES.icon`
  // and shrink with it. Softer than the circle's, because a glyph has far less
  // area to cast with and the same numbers would read as a smudge.
  glyphShadow: {
    textShadowColor: 'rgba(0, 0, 0, 0.45)',
    textShadowOffset: { width: 0, height: SIZES.icon * SHADOW.drop },
    textShadowRadius: SIZES.icon * SHADOW.radius,
  },
});

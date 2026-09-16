import { Pressable, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, type DerivedValue } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Feather from '@expo/vector-icons/Feather';
import type { DockMaterial } from './dockMaterial';
import { type DockFrame, SIZES } from './dockGeometry';

export type FeatherName = React.ComponentProps<typeof Feather>['name'];

/**
 * One route in the dock — a circle of glass, painted over when it is the
 * current route (or while the dock is open) and left bare otherwise. Every
 * visual property reads off the shared `frame`, so it never re-renders for the
 * animation; the one React prop that does change (`ink`) changes on navigation.
 *
 * ── Five layers, in this order ───────────────────────────────────────────────
 *   1. the **host**, which carries the position, the size and the shadow;
 *   2. the **blur**, clipped to a circle and always at full opacity;
 *   3. the **veil**, the wash over what the blur blurred;
 *   4. the **tint**, `frame.bg` — the current route's translucent fill, or a
 *      tile while the dock is open, or nothing at rest. It sits *over* the
 *      veil, so the fill is sakura over blurred sky rather than sakura washed
 *      white (or black), and *under* the rim, so the current route is still a
 *      piece of glass: lit edge and sheen over its colour like every other;
 *   5. the **rim** — the lit edge, with the sheen across the top inside it.
 *
 * The veil and the rim are the two layers that take `rest`, and they can,
 * because there is no blur in either. The host paints no background of its
 * own: anything it painted would sit behind the blur and be blurred into the
 * disc a second time. Its shadow is cast from the layer's alpha instead, which
 * is the disc's own shape.
 *
 * `overflow: 'hidden'` must stay off the host: it sets `masksToBounds`, which
 * clips a layer's own shadow away completely. It belongs on the four layers
 * inside it, which need clipping to a circle.
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
 * dot. `hitSlop` is half the tightest gap, so neighbouring targets meet without
 * overlapping — an overlap would hand the tap to whichever item is drawn last,
 * and the outer ones are only a few points across.
 */
export function DockItem({
  index,
  frame,
  material,
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
  material: DockMaterial;
  icon: FeatherName;
  label: string;
  ink: string;
  isCurrent: boolean;
  onPressIn: () => void;
  onPress: () => void;
  onLongPress: () => void;
  holdMs: number;
}) {
  const { shadow } = material;

  const host = useAnimatedStyle(() => {
    const item = frame.value.items[index];
    return {
      left: item.x,
      top: (frame.value.height - item.size) / 2,
      width: item.size,
      height: item.size,
      borderRadius: item.size / 2,
      shadowOpacity: shadow.opacity * item.rest,
    };
  });

  const round = useAnimatedStyle(() => ({
    borderRadius: frame.value.items[index].size / 2,
  }));

  const skin = useAnimatedStyle(() => {
    const item = frame.value.items[index];
    return { borderRadius: item.size / 2, opacity: item.rest };
  });

  const tint = useAnimatedStyle(() => {
    const item = frame.value.items[index];
    return { borderRadius: item.size / 2, backgroundColor: item.bg };
  });

  const glyph = useAnimatedStyle(() => {
    const item = frame.value.items[index];
    return {
      opacity: item.rest,
      transform: [{ scale: item.glyph / SIZES.icon }],
    };
  });

  return (
    <Animated.View
      style={[
        styles.item,
        {
          shadowColor: shadow.color,
          shadowOffset: { width: 0, height: shadow.offsetY },
          shadowRadius: shadow.radius,
        },
        host,
      ]}
    >
      <Animated.View style={[styles.clip, round]} pointerEvents="none">
        <BlurView intensity={material.blur} tint={material.blurTint} style={StyleSheet.absoluteFill} />
      </Animated.View>

      <Animated.View style={[styles.clip, { backgroundColor: material.veil }, skin]} pointerEvents="none" />

      <Animated.View style={[styles.clip, tint]} pointerEvents="none" />

      <Animated.View
        style={[styles.clip, { borderColor: material.edge, borderWidth: material.rimWidth }, skin]}
        pointerEvents="none"
      >
        <LinearGradient
          colors={[material.sheen, material.sheenEdge]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: material.sheenStop }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      <Pressable
        style={styles.press}
        onPressIn={onPressIn}
        onPress={onPress}
        onLongPress={onLongPress}
        delayLongPress={holdMs}
        hitSlop={SIZES.gapMin / 2}
        accessibilityRole="tab"
        accessibilityState={{ selected: isCurrent }}
        accessibilityLabel={label}
      >
        <Animated.View style={glyph}>
          <Feather name={icon} size={SIZES.icon} color={ink} />
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  item: {
    position: 'absolute',
  },
  clip: {
    ...StyleSheet.absoluteFillObject,
    // The blur is a native view; without this it ignores the radius.
    overflow: 'hidden',
  },
  press: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

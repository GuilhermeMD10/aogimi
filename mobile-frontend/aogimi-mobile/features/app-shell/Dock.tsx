import { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useDockHidden } from '@/features/app-shell/DockVisibility';
import { SURFACE_MS } from '@/theme/motion';
import { PressableBackdrop } from '@/shared/components/Touchable';
import { DockBar, type DockSlot } from './DockBar';
import type { FeatherName } from './DockItem';
import { DOCK_HEIGHT, SIZES } from './dockGeometry';

/**
 * The bottom dock — app chrome on every tab screen.
 *
 * The bar itself, and every gesture on it, is `DockBar`; this is the navigator
 * adapter around it. It answers three questions the bar cannot: which route is
 * current, what a selection should do, and where the bar sits above the bottom
 * edge.
 *
 * ── Selection ────────────────────────────────────────────────────────────────
 * `onSelect` emits `tabPress` and navigates, and returns `false` when a screen
 * prevents the event — that is the bar's cue to snap its highlight back rather
 * than sit on a route that was never entered.
 *
 * ── Open state lives here ────────────────────────────────────────────────────
 * Because the backdrop does: closing on an outside tap needs a full-screen
 * layer under the bar, which only this host can draw.
 *
 * ── Hiding fades; it does not unmount ────────────────────────────────────────
 * Unmounting cost a frame at the worst moment — leaving a focused deck
 * remounts the whole bar in the middle of the camera's zoom-out.
 */

/** Four tabs: Home · Reader · Dictionary · Sky. Declaration order is render
 *  order and matches `app/(tabs)/_layout.tsx`. */
const SLOTS = ['home', 'reader', 'dictionary', 'sky'] as const;
type SlotKey = (typeof SLOTS)[number];

const ICONS: Record<SlotKey, FeatherName> = {
  home: 'home',
  reader: 'book-open',
  dictionary: 'search',
  sky: 'star',
};

/** Breathing room between a screen's last row and the top of the bar. */
const CLEARANCE_ABOVE = 12;

const EASING = Easing.bezier(0.4, 0, 0.2, 1);

/**
 * How much bottom room a tab screen must leave so its last row clears the dock.
 *
 * **Why a hook and not a constant.** The dock floats, so the space it occupies
 * is its own height plus however far off the bottom edge it sits — and that
 * offset includes the safe-area inset. Zero while hidden, so a screen that
 * hides the dock gets the height back; the sky's camera insets read this.
 *
 * **Why not `useBottomTabBarHeight()`.** It reports the tab bar's height *in the
 * navigator's layout*, and this dock is absolutely positioned inside a
 * `box-none` host, so it contributes nothing there and the hook can answer 0.
 */
export function useDockClearance(): number {
  const insets = useSafeAreaInsets();
  const hidden = useDockHidden();
  if (hidden) return 0;
  return DOCK_HEIGHT + SIZES.bottom + insets.bottom + CLEARANCE_ABOVE;
}

export function Dock({ state, descriptors, navigation }: BottomTabBarProps) {
  const hidden = useDockHidden();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);

  const activeIdx = Math.max(0, SLOTS.indexOf(state.routes[state.index]?.name as SlotKey));

  const slots = useMemo<DockSlot[]>(
    () =>
      SLOTS.map((key) => {
        const route = state.routes.find((r) => r.name === key);
        const labelOpt = route ? descriptors[route.key]?.options.tabBarLabel : undefined;
        return { icon: ICONS[key], label: typeof labelOpt === 'string' ? labelOpt : key };
      }),
    [state.routes, descriptors],
  );

  const select = useCallback(
    (index: number) => {
      const route = state.routes.find((r) => r.name === SLOTS[index]);
      if (!route) return false;
      const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
      if (event.defaultPrevented) return false;
      navigation.navigate(SLOTS[index] as never);
      return true;
    },
    [state.routes, navigation],
  );

  const fade = useSharedValue(1);
  useEffect(() => {
    fade.value = withTiming(hidden ? 0 : 1, { duration: SURFACE_MS, easing: EASING });
    if (hidden) setOpen(false);
  }, [hidden, fade]);
  const host = useAnimatedStyle(() => ({ opacity: fade.value }));

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, styles.host, host]}
      pointerEvents={hidden ? 'none' : 'box-none'}
    >
      {open && <PressableBackdrop onPress={() => setOpen(false)} style={StyleSheet.absoluteFill} />}

      <View style={[styles.dock, { bottom: SIZES.bottom + insets.bottom }]} pointerEvents="box-none">
        <DockBar
          slots={slots}
          current={activeIdx}
          onSelect={select}
          open={open}
          onOpenChange={setOpen}
        />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  host: {
    zIndex: 55,
  },
  dock: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
});

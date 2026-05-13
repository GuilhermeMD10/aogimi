import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import Feather from '@expo/vector-icons/Feather';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useTheme } from '@/theme/ThemeContext';
import { fontFamily } from '@/theme/tokens';

// ── Spec ─────────────────────────────────────────────────────────────────────
//
// Static bar: the notch is part of the SVG path and is recomputed each render
// from the active slot index. There is NO animation -- when the active tab
// changes the notch snaps to its new position. (Earlier morphing code via
// Reanimated's useAnimatedProps was hitting a "non-worklet" runtime error
// because the path-builder couldn't run on the UI thread; pulling it out
// removes that entire class of native-side failure.)
//
// Visual cues remaining on the active slot:
//   - a deformed (notched) card background, with the notch above the active
//   - a "hero disc" lifted up through the notch with shadow + soft halo
//   - the icon in `INK`; idle icons in `MUTED`

const NAV_WIDTH = 362;
const NAV_HEIGHT = 80;
const NOTCH_W = 70;
const NOTCH_DEPTH = 10;
const ICON = 20;
// Bar is bottom-flush, full-width. CARD_RADIUS / SIDE_INSET / BOTTOM removed
// -- the bar's sides touch the screen edges and its bottom is the screen's
// bottom edge. Safe-area is absorbed by extending the SVG height instead of
// padding the host.

const SLOTS = ['profile', 'dictionary', 'reader', 'decks', 'settings'] as const;
type SlotKey = (typeof SLOTS)[number];

// Slot centers at (i + 0.5) / N of the viewBox width, matching the
// space-around distribution in the slot row below.
const NOTCH_X: number[] = SLOTS.map((_, i) => ((i + 0.5) / SLOTS.length) * NAV_WIDTH);

type FeatherName = React.ComponentProps<typeof Feather>['name'];
const ICONS: Record<SlotKey, FeatherName> = {
  profile: 'user',
  dictionary: 'search',
  reader: 'book-open',
  decks: 'layers',
  settings: 'settings',
};

const FALLBACK_LABELS: Record<SlotKey, string> = {
  profile: 'You',
  dictionary: 'Dictionary',
  reader: 'Books',
  decks: 'Decks',
  settings: 'Settings',
};

const INK = '#1A1918';
const PAPER = '#FFFEFB';
const MUTED = 'rgba(26,25,24,0.55)';
const BORDER_HAIR = 'rgba(26,25,24,0.10)';

// Square-cornered bar with a notch carved into the top edge. `h` is passed in
// so the path extends through the device's bottom safe area (computed at
// render time from useSafeAreaInsets).
function buildPath(notchX: number, h: number): string {
  const w = NAV_WIDTH;
  const nw = NOTCH_W;
  const nd = NOTCH_DEPTH;
  const a = notchX - nw / 2;
  const b = notchX + nw / 2;
  return (
    `M0,0 L${a},0 ` +
    `C${a + nw * 0.3},0 ${a + nw * 0.35},${nd} ${notchX},${nd} ` +
    `C${b - nw * 0.35},${nd} ${b - nw * 0.3},0 ${b},0 ` +
    `L${w},0 L${w},${h} L0,${h} Z`
  );
}

// ── Component ────────────────────────────────────────────────────────────────

export function NotchedNavBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();

  const paper = theme.meta.isDark ? '#1E1818' : PAPER;
  const ink = theme.meta.isDark ? '#FAFAF9' : INK;
  const muted = theme.meta.isDark ? 'rgba(250,250,249,0.55)' : MUTED;
  const border = theme.meta.isDark ? 'rgba(250,250,249,0.10)' : BORDER_HAIR;

  const activeRouteName = state.routes[state.index]?.name ?? '';
  const activeSlotIdx = Math.max(0, SLOTS.indexOf(activeRouteName as SlotKey));
  const targetX = NOTCH_X[activeSlotIdx];

  // Animated notchX -- legacy Animated API on purpose. A worklet-based
  // Reanimated approach previously hit "tried to synchronously call non-
  // worklet" at native build time. The legacy API stays on the JS thread:
  // a single Animated.Value drives a JS listener that calls setState with
  // the interpolated X each frame; the path string rebuilds and the SVG
  // re-renders. Tab changes are infrequent so the per-frame re-render cost
  // is invisible. Tween: 220ms with the handoff's cubic-bezier(0.32, 0.72,
  // 0, 1) easing.
  const animX = useRef(new Animated.Value(targetX)).current;
  const [currentNotchX, setCurrentNotchX] = useState<number>(targetX);

  useEffect(() => {
    const sub = animX.addListener(({ value }) => setCurrentNotchX(value));
    return () => animX.removeListener(sub);
  }, [animX]);

  useEffect(() => {
    Animated.timing(animX, {
      toValue: targetX,
      duration: 220,
      easing: Easing.bezier(0.32, 0.72, 0, 1),
      useNativeDriver: false,
    }).start();
  }, [targetX, animX]);

  // SVG height absorbs the device's bottom safe area so the bar's paper color
  // continues under the home indicator -- no gap, no exposed page color below
  // the slot row.
  const svgH = NAV_HEIGHT + insets.bottom;
  const pathD = buildPath(currentNotchX, svgH);

  return (
    <View pointerEvents="box-none" style={styles.host}>
      <View style={styles.cardWrap}>
        <Svg
          width="100%"
          height={svgH}
          viewBox={`0 0 ${NAV_WIDTH} ${svgH}`}
          preserveAspectRatio="none"
        >
          <Path d={pathD} fill={paper} stroke={border} strokeWidth={1} />
        </Svg>

        <View style={styles.slotsRow} pointerEvents="box-none">
          {SLOTS.map((key, i) => {
            const route = state.routes.find((r) => r.name === key);
            if (!route) return <View key={key} style={styles.slotPlaceholder} />;

            const active = i === activeSlotIdx;
            const descriptor = descriptors[route.key];
            const labelOpt = descriptor?.options.tabBarLabel;
            const label =
              typeof labelOpt === 'string'
                ? labelOpt
                : (descriptor?.options.title ?? FALLBACK_LABELS[key]);

            const onPress = () => {
              const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!active && !event.defaultPrevented) navigation.navigate(key as never);
            };

            return (
              <Slot
                key={key}
                label={label}
                iconName={ICONS[key]}
                active={active}
                ink={ink}
                muted={muted}
                paper={paper}
                onPress={onPress}
              />
            );
          })}
        </View>
      </View>
    </View>
  );
}

// ── Slot ─────────────────────────────────────────────────────────────────────

function Slot({
  label,
  iconName,
  active,
  ink,
  muted,
  paper,
  onPress,
}: {
  label: string;
  iconName: FeatherName;
  active: boolean;
  ink: string;
  muted: string;
  paper: string;
  onPress: () => void;
}) {
  // Same layout for both states; active gets a 1px ink border and the
  // multi-layer box-shadow recipe from the handoff (drop + tight + inset
  // highlight). RN 0.76+ supports the CSS `boxShadow` syntax verbatim, so
  // the three layers come through as authored -- no manual decomposition
  // into shadow* / elevation props.
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      hitSlop={4}
      style={styles.slot}
    >
      <View style={styles.col}>
        <View
          style={[
            styles.iconWrap,
            active && {
              backgroundColor: paper,
              borderColor: ink,
              borderWidth: 1,
              // Multi-layer box-shadow from the handoff: a 4/10 drop, a
              // 1/2 tight anchor, and an inset top highlight for the paper
              // sheen. RN 0.76+ accepts the CSS-style string syntax verbatim.
              boxShadow:
                '0px 4px 10px rgba(26,25,24,0.18), 0px 1px 2px rgba(26,25,24,0.10), inset 0px 1px 0px rgba(255,255,255,0.8)',
            },
          ]}
        >
          <Feather name={iconName} size={ICON} color={active ? ink : muted} />
        </View>
        <Text style={[styles.label, { color: active ? ink : muted }]} numberOfLines={1}>
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 55,
  },
  cardWrap: {
    // Upward-pointing shadow: a downward one on a bottom-flush bar would
    // project off-screen, so the bar appears to "lift" toward the content
    // above it instead.
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.18,
    shadowRadius: 22,
    elevation: 12,
  },
  slotsRow: {
    // Constrained to the top NAV_HEIGHT so the icon row never drifts into
    // the safe-area extension below (which is just paper-fill from the SVG).
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: NAV_HEIGHT,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  slot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: NAV_HEIGHT,
  },
  slotPlaceholder: {
    flex: 1,
  },
  col: {
    alignItems: 'center',
    gap: 3,
  },
  iconWrap: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  label: {
    fontFamily: fontFamily.ui,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.4,
    textAlign: 'center',
  },
});

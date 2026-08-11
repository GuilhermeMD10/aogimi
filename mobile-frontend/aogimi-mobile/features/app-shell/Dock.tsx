import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, LayoutChangeEvent, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Feather from '@expo/vector-icons/Feather';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { fontFamily, palette } from '@/theme/tokens';

/**
 * The bottom dock — app chrome on every tab screen.
 *
 * **It is glass now, not the near-black slab it was.** This is the web's dock material, from the
 * "Aogimi — Dock Bar" handoff via `web-frontend/aogimi-web/styles/glass.css` (the `--dock-glass-*`
 * block and the three `.glass-dock*` recipes): a white-tinted frosted shell with a lit lavender pill
 * that **slides** between entries. The old `--dock-*` group is gone on the web and its equivalents —
 * the mobile handoff's `dockbg` / `dockact` / `dockactink` — are not used here either.
 *
 * Replaces `NotchedNavBar`, whose name had already outlived its notch and whose colours were two
 * hardcoded light-theme hexes (`#1A1918` / `#FFFEFB`) with an `isDark` branch bolted on.
 *
 * ── Geometry is the handoff's, material is the web's ─────────────────────────────────────────────
 * The mobile handoff draws four equal tabs — icon over label, `padding 7px 8px`, `radius 20` shell /
 * `13` tabs, `gap 2` — and that is what this is. The web's dock is a different *shape* (one row of
 * icon-beside-label entries at their natural widths, plus a divider and an avatar) because it is a
 * desktop bar; copying its shape onto a phone would be the wrong half to take. So: the handoff owns
 * the box, the web owns the colour, which is the standing rule for this whole redesign.
 *
 * ── The one place equal tabs make this simpler than the web ──────────────────────────────────────
 * The web has to *measure* its active item (`offsetLeft`/`offsetWidth` via a ResizeObserver, keyed on
 * `aria-current`) because its entries are label-width and therefore all different. Four equal tabs
 * make the pill's width a constant — the tab width — so only its **x** moves, and `translateX` is
 * native-drivable. The slide runs on the UI thread with `useNativeDriver: true` and there is no
 * measurement to keep in sync; one `onLayout` on the row is the whole of it.
 *
 * ── What of the web's material is not reproduced ─────────────────────────────────────────────────
 * The `inset 0 0 12px 2px` **inner glow** on the shell and the pill. RN has no inset box-shadow that
 * can be relied on across both platforms at this RN version, and a soft inward glow is not
 * expressible with plain views. The two 1px **edge sheens** and the 1px **top specular line** — which
 * are what actually read as "lit glass" — are reproduced exactly, as absolutely-positioned hairlines
 * and a horizontal gradient. Every alpha below is the web's own derivation (`border` = tint@0.30r,
 * top sheen = 0.55r, bottom sheen = 0.15r, top line = 0.80r, at r = .25 for the shell and .50 for
 * the pill).
 */

/* ── Dock material, reset for legibility (2026-08-10) ─────────────────────────────────────────────
   Was the web's `--dock-glass-*` block resolved verbatim: a 15%-white shell with 3.8–13.8% sheens
   and a lavender pill. Every one of those alphas was tuned against the web's lit canvas, and on a
   flat-black phone screen the shell edge and both sheens were invisible — the dock read as a
   floating pill with nothing around it.

   So the shell keeps its translucency (it must not hide the screen scrolling under it) but at a
   density you can actually see, and everything that was a hairline alpha is now **opaque**. The pill
   is a solid `palette.active` rather than a 65% tint, so "which tab am I on" needs no squinting.

   Still local consts rather than theme tokens: the dock is one material, and the redesign will want
   to tune it as a unit. The two inks come from `palette` because "inactive tab label" and "ink on the
   selected pill" are exactly `muted` and `activeInk`. */
const GLASS = {
  /** shell · white tint, dense enough to read as a surface on a black canvas */
  fill: 'rgba(255, 255, 255, 0.16)',
  bd: '#8a8a8a',
  sheenTop: 'rgba(255, 255, 255, 0.22)',
  sheenBottom: 'rgba(255, 255, 255, 0.10)',
  /** the top specular line, brightest in the middle */
  lineMid: 'rgba(255, 255, 255, 0.55)',
  /** pill · solid selection colour, so the active tab is unmistakable */
  pillFill: palette.active,
  pillBd: '#ffffff',
  pillSheenTop: 'rgba(255, 255, 255, 0.32)',
  pillSheenBottom: 'rgba(255, 255, 255, 0.12)',
  pillLineMid: 'rgba(255, 255, 255, 0.6)',
  /** inks. The active one sits ON the pill, so it pairs with `pillFill`. */
  ink: palette.muted,
  inkActive: palette.activeInk,
} as const;

/** `--dock-glass-blur: 13px`. expo-blur takes 1–100 rather than px; 13px of backdrop blur sits
 *  around here, and it is the one value to tweak if the shell reads too clear or too milky. */
const BLUR_INTENSITY = 24;

/** `--dock-glass-slide: 280ms cubic-bezier(0.4, 0, 0.2, 1)` — the standard-decelerate curve. */
const SLIDE_MS = 280;
const SLIDE_EASING = Easing.bezier(0.4, 0, 0.2, 1);

/* ── Geometry, from the handoff ─────────────────────────────────────────────────────────────────── */
const SHELL_INSET_X = 12;
const SHELL_BOTTOM = 14;
const SHELL_RADIUS = 20;
const SHELL_PAD_V = 7;
const SHELL_PAD_H = 8;
const TAB_GAP = 2;
const TAB_RADIUS = 13;
const ICON = 19;

/**
 * The handoff's four tabs, in its order: Home · Reader · Dictionary · Sky.
 *
 * Declaration order is render order. Profile and Settings are not here — they left the dock in the
 * route restructure and are pushed screens now (Profile from Home's header avatar, Settings from
 * Profile). Neither are the decks: there is no decks page, the decks *are* the Sky, so a deck's
 * detail screen and a study session both keep Sky lit rather than taking a tab of their own.
 */
const SLOTS = ['home', 'reader', 'dictionary', 'sky'] as const;
type SlotKey = (typeof SLOTS)[number];

type FeatherName = React.ComponentProps<typeof Feather>['name'];
const ICONS: Record<SlotKey, FeatherName> = {
  home: 'home',
  reader: 'book-open',
  dictionary: 'search',
  sky: 'star',
};

/** Used only if a screen declares no `tabBarLabel` — the real labels are the `nav.*` i18n keys,
 *  passed down by `app/(tabs)/_layout.tsx`. */
const FALLBACK_LABELS: Record<SlotKey, string> = {
  home: 'Home',
  reader: 'Reader',
  dictionary: 'Dictionary',
  sky: 'Sky',
};

/**
 * The shell's own height, from the geometry above:
 *
 *   2 · border 1  +  2 · paddingVertical 7  +  slot (paddingTop 8 + icon 19 + gap 3 + label ~12 +
 *   paddingBottom 6)  =  2 + 14 + 48  =  64
 *
 * The label term is the one approximation — a 9.5px line box, which RN resolves per platform. A
 * couple of px either way does not matter for the clearance below, and a screen needing the exact
 * figure should measure rather than trust this.
 */
const DOCK_SHELL_HEIGHT = 64;

/**
 * How much bottom room a tab screen must leave so its last row clears the dock.
 *
 * **Why a hook and not a constant.** The dock *floats*, so the space it occupies is its own height
 * plus however far off the bottom edge it sits — and that offset is the safe-area inset on a device
 * that has one. A screen therefore cannot know the figure without asking.
 *
 * **Why not `useBottomTabBarHeight()`.** React Navigation's hook reports the height of the tab bar
 * *in the navigator's layout*, and this dock is `position: absolute` inside a `box-none` host, so it
 * contributes nothing to that layout and the hook can legitimately answer 0. A screen padded from it
 * would have its last row sitting under the glass.
 */
export function useDockClearance(): number {
  const insets = useSafeAreaInsets();
  return DOCK_SHELL_HEIGHT + Math.max(SHELL_BOTTOM, insets.bottom) + SHELL_BOTTOM;
}

export function Dock({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const activeRouteName = state.routes[state.index]?.name ?? '';
  const activeIdx = Math.max(0, SLOTS.indexOf(activeRouteName as SlotKey));

  /* ── The sliding pill ──────────────────────────────────────────────────────────────────────────
     One measurement — the width of the row the tabs share — is enough, because the tabs are equal.
     `tabW` is that width per tab including its gap share; the pill is one tab wide and only its x
     moves. Held in state (not a ref) because the pill's width is rendered from it. */
  const [rowW, setRowW] = useState(0);
  const onRowLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0) setRowW((prev) => (prev === w ? prev : w));
  };
  const tabW = rowW > 0 ? (rowW - TAB_GAP * (SLOTS.length - 1)) / SLOTS.length : 0;

  const slide = useRef(new Animated.Value(0)).current;
  // Skip the animation for the first placement, so the pill appears under the active tab instead of
  // sliding in from the left edge on mount — the same reason the web starts its pill at opacity 0.
  const placed = useRef(false);
  useEffect(() => {
    if (tabW === 0) return;
    const to = activeIdx * (tabW + TAB_GAP);
    if (!placed.current) {
      placed.current = true;
      slide.setValue(to);
      return;
    }
    Animated.timing(slide, {
      toValue: to,
      duration: SLIDE_MS,
      easing: SLIDE_EASING,
      useNativeDriver: true,
    }).start();
  }, [activeIdx, tabW, slide]);

  return (
    <View pointerEvents="box-none" style={[styles.host, { bottom: Math.max(SHELL_BOTTOM, insets.bottom) }]}>
      <View style={styles.shell}>
        {/* The frosted material. `overflow: hidden` on the shell is what clips the blur, the
            hairlines and the pill to the rounded corners — the web gets that from
            `border-radius: inherit` on its pseudo-elements. */}
        <BlurView
          intensity={BLUR_INTENSITY}
          tint="dark"
          // Android has no real backdrop blur without this; without it the fill alone carries the
          // surface there, which is why the fill is a visible 15% rather than a token 1%.
          experimentalBlurMethod={Platform.OS === 'android' ? 'dimezisBlurView' : undefined}
          style={StyleSheet.absoluteFill}
        />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: GLASS.fill }]} />
        <Sheens top={GLASS.sheenTop} bottom={GLASS.sheenBottom} lineMid={GLASS.lineMid} />

        <View style={styles.row} onLayout={onRowLayout}>
          {/* Under the items and inert: the pill is the only thing that fills behind an active
              entry, which is what lets it slide rather than cross-fade between two tinted boxes. */}
          {tabW > 0 && (
            <Animated.View
              pointerEvents="none"
              style={[
                styles.pill,
                { width: tabW, transform: [{ translateX: slide }] },
              ]}
            >
              <View style={[StyleSheet.absoluteFill, styles.pillFace]} />
              <Sheens
                top={GLASS.pillSheenTop}
                bottom={GLASS.pillSheenBottom}
                lineMid={GLASS.pillLineMid}
                radius={TAB_RADIUS}
              />
            </Animated.View>
          )}

          {SLOTS.map((key, i) => {
            const route = state.routes.find((r) => r.name === key);
            if (!route) return <View key={key} style={styles.slot} />;

            const active = i === activeIdx;
            const descriptor = descriptors[route.key];
            const labelOpt = descriptor?.options.tabBarLabel;
            const label =
              typeof labelOpt === 'string' ? labelOpt : (descriptor?.options.title ?? FALLBACK_LABELS[key]);

            const onPress = () => {
              const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!active && !event.defaultPrevented) navigation.navigate(key as never);
            };

            return (
              <Pressable
                key={key}
                onPress={onPress}
                accessibilityRole="button"
                accessibilityLabel={label}
                accessibilityState={{ selected: active }}
                style={({ pressed }) => [
                  styles.slot,
                  {
                    // Stable-shape transform: RN 0.83 + Fabric coerces a conditional `undefined` to
                    // null between press states and crashes the transform processor. This is the
                    // app-wide press nudge, the equivalent of the web's `.glass-press`.
                    transform: [{ translateY: pressed ? 1 : 0 }],
                  },
                ]}
              >
                <Feather name={ICONS[key]} size={ICON} color={active ? GLASS.inkActive : GLASS.ink} />
                <Text
                  style={[styles.label, { color: active ? GLASS.inkActive : GLASS.ink }]}
                  numberOfLines={1}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

/**
 * The lit edges of a glass surface: a 1px sheen along the top and the bottom, and over the top one a
 * horizontal gradient that is brightest in the middle — the web's `::before` with
 * `background-size: 100% 1px`.
 *
 * The light is white on both the shell and the pill, at different strengths. It is the light hitting
 * the surface, not the surface's colour, which is why only the fill takes the lavender tint.
 */
function Sheens({
  top,
  bottom,
  lineMid,
  radius,
}: {
  top: string;
  bottom: string;
  lineMid: string;
  radius?: number;
}) {
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, radius ? { borderRadius: radius } : null]}>
      <View style={[styles.hairline, { top: 0, backgroundColor: top }]} />
      <LinearGradient
        colors={['rgba(255, 255, 255, 0)', lineMid, 'rgba(255, 255, 255, 0)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.hairline, { top: 0 }]}
      />
      <View style={[styles.hairline, { bottom: 0, backgroundColor: bottom }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    left: SHELL_INSET_X,
    right: SHELL_INSET_X,
    zIndex: 55,
  },
  shell: {
    borderRadius: SHELL_RADIUS,
    borderWidth: 1,
    borderColor: GLASS.bd,
    paddingVertical: SHELL_PAD_V,
    paddingHorizontal: SHELL_PAD_H,
    // clips the blur, the hairlines and the pill to the rounded corners
    overflow: 'hidden',
    // the handoff's drop shadow: 0 14px 30px rgba(0,0,0,.35). RN's shadowRadius is the CSS blur
    // halved, as everywhere else in this app.
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.35,
    shadowRadius: 15,
    elevation: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: TAB_GAP,
    // the pill is absolutely positioned against this box, so it must be the positioning context
    position: 'relative',
  },
  pill: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    borderRadius: TAB_RADIUS,
    borderWidth: 1,
    borderColor: GLASS.pillBd,
    overflow: 'hidden',
  },
  pillFace: { backgroundColor: GLASS.pillFill, borderRadius: TAB_RADIUS },
  slot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingTop: 8,
    paddingBottom: 6,
    borderRadius: TAB_RADIUS,
  },
  label: {
    fontFamily: fontFamily.ui,
    fontSize: 9.5,
    fontWeight: '700',
    textAlign: 'center',
  },
  hairline: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
  },
});

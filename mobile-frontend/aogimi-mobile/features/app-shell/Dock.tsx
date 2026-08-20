import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import Feather from '@expo/vector-icons/Feather';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useDockHidden } from '@/features/app-shell/DockVisibility';
import { usePalette, useTheme } from '@/theme/ThemeContext';
import { BLUR_INTENSITY, glassWash } from '@/theme/glass';
import { DECELERATE, SLIDE_MS } from '@/theme/motion';
import { fontFamily, type Palette } from '@/theme/tokens';
import { Sheens } from '@/shared/components/Sheens';
import { Touchable } from '@/shared/components/Touchable';

/**
 * The bottom dock — app chrome on every tab screen.
 *
 * The material is the web's dock glass (`web-frontend/aogimi-web/styles/glass.css`, the
 * `--dock-glass-*` block and the three `.glass-dock*` recipes): a frosted shell with a lit pill
 * that **slides** between entries.
 *
 * ── Geometry is mobile's own, material is the web's ──────────────────────────────────────────────
 * Four equal tabs — icon over label, `padding 7px 8px`, `radius 20` shell / `13` tabs, `gap 2`.
 * The web's dock is a different *shape* (one row of icon-beside-label entries at their natural
 * widths, plus a divider and an avatar) because it is a desktop bar; copying its shape onto a
 * phone would be the wrong half to take.
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

/* ── Dock material — one material, two directions ─────────────────────────────────────────────────
   The wash **inverts with the theme**, because a translucent film only reads if it darkens or
   lightens what scrolls under it. On Day's off-white canvas that means a black tint; on Night's
   near-black canvas a black tint over black is nothing at all, so Night takes a white one. The
   blur `tint` prop flips with it. Everything else — the alphas' ratios, the geometry, the pill —
   is shared.

   Local consts rather than theme tokens: the dock is one material and wants to be tuned as a
   unit. The three palette reads are the ones that genuinely belong to the app's vocabulary:
   "the selected thing" and the two inks. */
type Glass = ReturnType<typeof glassWash> & {
  pillFill: string;
  pillBd: string;
  pillSheenTop: string;
  pillSheenBottom: string;
  pillLineMid: string;
  ink: string;
  inkActive: string;
};

/**
 * **The wash now comes from `theme/glass.ts`**, which every glass control in the
 * app shares. What stays here is the dock's own set — the pill and the two inks
 * — mirroring the web, where `--dock-glass-*` is a separate block even where a
 * value lands identically: the dock is one always-on-screen element with its own
 * tweak pass, and it has to stay re-balanceable without touching the surfaces
 * that share the button recipe.
 */
function glassFor(p: Palette, isNight: boolean): Glass {
  return {
    ...glassWash(p, isNight),
    /** pill · solid selection colour, so the active tab is unmistakable */
    pillFill: p.active,
    pillBd: p.ink,
    // The pill's own sheens stay light in both: it is a *lit* object sitting on
    // the shell, and its ground is the saturated `active` fill rather than the
    // page, so it does not invert with the canvas.
    pillSheenTop: 'rgba(255, 255, 255, 0.28)',
    pillSheenBottom: 'rgba(255, 255, 255, 0.10)',
    pillLineMid: 'rgba(255, 255, 255, 0.5)',
    /** inks. The active one sits ON the pill, so it pairs with `pillFill` —
     *  which is why it is `activeInk` and not `ink`. */
    ink: p.muted,
    inkActive: p.activeInk,
  };
}

/* ── Geometry ───────────────────────────────────────────────────────────────────────────────────── */
const SHELL_INSET_X = 12;
const SHELL_BOTTOM = 14;
const SHELL_RADIUS = 20;
/**
 * The shell's visual inset — and, since 2026-08-19, **padding on the tabs
 * rather than on the shell**.
 *
 * It used to be `padding` on the shell, which made the outer ring of a dock that
 * is visibly 64pt tall a dead zone: the bar looked bigger than it could be
 * tapped, which is precisely the complaint that produced `Touchable`. The tabs
 * now span the shell edge to edge and carry this as their own padding, so the
 * whole visible dock answers a touch. The horizontal half is gone entirely —
 * `PILL_INSET_X` keeps the pill where it always sat.
 */
const SHELL_PAD_V = 7;

/** How far the pill sits inside its tab column. Replaces the shell's horizontal
 *  padding plus the old 2pt inter-tab gap — both were dead space, and with a
 *  sliding pill the gap was never visible anyway. */
const PILL_INSET_X = 6;
const TAB_RADIUS = 13;
const ICON = 19;

/**
 * Four tabs: Home · Reader · Dictionary · Sky.
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
/** How long the dock takes to fade out of the way of a focused deck, and back. */
const DOCK_FADE_MS = 180;

export function useDockClearance(): number {
  const insets = useSafeAreaInsets();
  const hidden = useDockHidden();
  // Zero while hidden, so a screen that hides the dock gets the height back rather than padding
  // around glass that is not there. The sky's camera insets read this, so a focused deck spends
  // every pixel the dock stops occupying.
  if (hidden) return 0;
  return DOCK_SHELL_HEIGHT + Math.max(SHELL_BOTTOM, insets.bottom) + SHELL_BOTTOM;
}

export function Dock({ state, descriptors, navigation }: BottomTabBarProps) {
  const hidden = useDockHidden();
  const insets = useSafeAreaInsets();
  const p = usePalette();
  const { themeName } = useTheme();
  const GLASS = useMemo(() => glassFor(p, themeName === 'night'), [p, themeName]);
  // Only the three colour-bearing style rules depend on the theme; the rest of
  // `styles` is geometry and stays a module-scope StyleSheet.
  const themed = useMemo(
    () => ({
      shell: { borderColor: GLASS.bd },
      pill: { borderColor: GLASS.pillBd },
      pillFace: { backgroundColor: GLASS.pillFill },
    }),
    [GLASS],
  );
  const activeRouteName = state.routes[state.index]?.name ?? '';
  const activeIdx = Math.max(0, SLOTS.indexOf(activeRouteName as SlotKey));

  /* ── The sliding pill ──────────────────────────────────────────────────────────────────────────
     One measurement — the width of the row the tabs share — is enough, because the tabs are equal.
     `tabW` is that width per tab; the pill is one tab wide less `PILL_INSET_X` on each side, and
     only its x moves. Held in state (not a ref) because the pill's width is rendered from it. */
  const [rowW, setRowW] = useState(0);
  const onRowLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0) setRowW((prev) => (prev === w ? prev : w));
  };
  const tabW = rowW > 0 ? rowW / SLOTS.length : 0;

  const slide = useRef(new Animated.Value(0)).current;
  // Skip the animation for the first placement, so the pill appears under the active tab instead of
  // sliding in from the left edge on mount — the same reason the web starts its pill at opacity 0.
  const placed = useRef(false);
  useEffect(() => {
    if (tabW === 0) return;
    const to = activeIdx * tabW + PILL_INSET_X;
    if (!placed.current) {
      placed.current = true;
      slide.setValue(to);
      return;
    }
    Animated.timing(slide, {
      toValue: to,
      duration: SLIDE_MS,
      easing: DECELERATE,
      useNativeDriver: true,
    }).start();
  }, [activeIdx, tabW, slide]);

  // Native-driven, like the pill: opacity is the one property that can leave the JS thread entirely,
  // which is the whole point of fading rather than unmounting.
  const fade = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.timing(fade, {
      toValue: hidden ? 0 : 1,
      duration: DOCK_FADE_MS,
      easing: DECELERATE,
      useNativeDriver: true,
    }).start();
  }, [hidden, fade]);

  /**
   * Hiding **fades; it does not unmount.**
   *
   * `return null` was the first version, and it cost a frame at the worst moment: leaving a focused
   * deck remounts the whole dock — BlurView init, gradients, the row measurement, the pill's slide —
   * as JS work landing in the middle of the camera's zoom-out flight. It was also why the expo-blur
   * warnings appeared *on that transition* specifically: they are logged per BlurView mount.
   *
   * The trade is that an invisible dock still composites. If that shows up on device, gate the
   * `<BlurView>` child on a fully-hidden state rather than going back to unmounting the host.
   */
  return (
    <Animated.View
      pointerEvents={hidden ? 'none' : 'box-none'}
      style={[styles.host, { bottom: Math.max(SHELL_BOTTOM, insets.bottom), opacity: fade }]}
    >
      <View style={[styles.shell, themed.shell]}>
        {/* The frosted material. `overflow: hidden` on the shell is what clips the blur, the
            hairlines and the pill to the rounded corners — the web gets that from
            `border-radius: inherit` on its pseudo-elements. */}
        <BlurView
          intensity={BLUR_INTENSITY}
          // Follows the wash: a dark frost over a light page turns the dock into a black slab and
          // swallows the tab ink, and a light frost over a dark page does the mirror of that.
          tint={GLASS.blurTint}
          // **No Android blur method on purpose.** `dimezisBlurView` was set here, and expo-blur 55
          // logs two warnings for it: `experimentalBlurMethod` is deprecated in favour of
          // `blurMethod`, and `dimezisBlurView` now requires a `blurTarget` ref or it "will fallback
          // to none blur method to avoid errors". So it was already doing nothing while warning twice
          // per mount. `blurTarget` wants a ref to the view being blurred, which a dock floating over
          // whichever screen is beneath it cannot name — so Android keeps the fill as its surface,
          // which is exactly why the fill is a visible 10% rather than a token 1%.
          style={StyleSheet.absoluteFill}
        />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: GLASS.fill }]} />
        <Sheens
          top={GLASS.sheenTop}
          bottom={GLASS.sheenBottom}
          lineMid={GLASS.lineMid}
          lineEdge={themeName === 'night' ? 'rgba(255, 255, 255, 0)' : 'rgba(0, 0, 0, 0)'}
        />

        <View style={styles.row} onLayout={onRowLayout}>
          {/* Under the items and inert: the pill is the only thing that fills behind an active
              entry, which is what lets it slide rather than cross-fade between two tinted boxes. */}
          {tabW > 0 && (
            <Animated.View
              pointerEvents="none"
              style={[
                styles.pill,
                themed.pill,
                { width: tabW - PILL_INSET_X * 2, transform: [{ translateX: slide }] },
              ]}
            >
              <View style={[StyleSheet.absoluteFill, styles.pillFace, themed.pillFace]} />
              <Sheens
                top={GLASS.pillSheenTop}
                bottom={GLASS.pillSheenBottom}
                lineMid={GLASS.pillLineMid}
                lineEdge="rgba(255, 255, 255, 0)"
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
              <Touchable
                key={key}
                onPress={onPress}
                accessibilityRole="button"
                accessibilityLabel={label}
                accessibilityState={{ selected: active }}
                // No `surface="glass"`: the sliding pill is this control's fill, and a second
                // wash under it would double the material. The nudge and the haptic are the
                // shared ones — the dock's hand-rolled `translateY` was the app's only press
                // feedback before `Touchable` existed, and this is that treatment generalised.
                minTarget={false}
                style={styles.slot}
              >
                <Feather name={ICONS[key]} size={ICON} color={active ? GLASS.inkActive : GLASS.ink} />
                <Text
                  style={[styles.label, { color: active ? GLASS.inkActive : GLASS.ink }]}
                  numberOfLines={1}
                >
                  {label}
                </Text>
              </Touchable>
            );
          })}
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    left: SHELL_INSET_X,
    right: SHELL_INSET_X,
    zIndex: 55,
  },
  // The three rules below carry geometry only — `borderColor` / `backgroundColor`
  // come from `themed` at the call site, since they flip with the theme and a
  // module-scope StyleSheet cannot see it.
  shell: {
    borderRadius: SHELL_RADIUS,
    borderWidth: 1,
    // No padding: the tabs reach the shell's inner edge so every pixel of the
    // dock is tappable. `SHELL_PAD_V` lives on the slot instead, and
    // `PILL_INSET_X` keeps the pill where it always sat.
    // clips the blur, the hairlines and the pill to the rounded corners
    overflow: 'hidden',
    // Drop shadow, 0 14px 30px rgba(0,0,0,.35). RN's shadowRadius is the CSS blur
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
    // the pill is absolutely positioned against this box, so it must be the positioning context
    position: 'relative',
  },
  pill: {
    position: 'absolute',
    top: SHELL_PAD_V,
    bottom: SHELL_PAD_V,
    left: 0,
    borderRadius: TAB_RADIUS,
    borderWidth: 1,
    overflow: 'hidden',
  },
  pillFace: { borderRadius: TAB_RADIUS },
  slot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    // The shell's former padding, moved here — see `SHELL_PAD_V`. A tab is now
    // the full height of the dock rather than 48 of its 64 points.
    paddingTop: SHELL_PAD_V + 8,
    paddingBottom: SHELL_PAD_V + 6,
    borderRadius: TAB_RADIUS,
  },
  label: {
    fontFamily: fontFamily.ui,
    fontSize: 9.5,
    fontWeight: '700',
    textAlign: 'center',
  },
});

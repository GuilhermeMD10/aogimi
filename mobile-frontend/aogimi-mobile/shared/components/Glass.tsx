import { useMemo } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { usePalette, useTheme } from '@/theme/ThemeContext';
import { glassAccent, glassSheet, glassTier, type GlassTier } from '@/theme/glass';
import { radius as radii } from '@/theme/tokens';

/**
 * **A pane of glass.** The material every surface in the app is made of — cards,
 * rows, chips, buttons, sheets, popovers. Pick a tier; the recipe does the rest.
 *
 * See `theme/glass.ts` for what the four tiers mean and why only 3 and 4 mount
 * a live blur.
 *
 * ── The rim is the top border, not an inset line ───────────────────────────
 * DESIGN.md draws the specular hairline as `inset 0 1px 0`. RN has no inset
 * shadow, and an absolutely-positioned 1px line cuts straight across a 16px
 * rounded corner. Colouring the **top border edge** brighter than the other
 * three (`borderTopColor`) gives the same lit-from-above read and follows the
 * curve exactly. Day has no rim (DESIGN.md → Daybreak Glow → Glass), and its
 * token is zero-alpha, so the same code produces a uniform edge there.
 *
 * ── `overflow: 'hidden'` only when there is a blur ─────────────────────────
 * Clipping is what keeps a `BlurView` inside the rounded corners, but on iOS it
 * also clips the pane's own drop shadow. Tiers 1 and 2 therefore stay unclipped
 * and keep their shadow; Tiers 3 and 4 clip, and they are sheets and popovers,
 * which sit against a scrim rather than needing to lift off the canvas. A
 * caller that needs a Tier 1/2 pane to clip its children passes `clip`.
 */
/**
 * Which recipe the pane takes.
 *
 *   · `tier`   the four elevations, picked by `tier` — the default.
 *   · `accent` the focused deck node, a selected row, an accent icon plate.
 *              Reserved by DESIGN.md; a card never takes it.
 *   · `sheet`  Tier 4 with its own ground, for a pane raised over content that
 *              is not the canvas. See `glassSheet`.
 *
 * One prop rather than a boolean each, because they are mutually exclusive:
 * two flags would have a meaningless fourth state and a rule about which wins.
 */
export type GlassMaterial = 'tier' | 'accent' | 'sheet';

export function Glass({
  children,
  tier = 2,
  material = 'tier',
  radius = radii.card,
  shadow = true,
  clip = false,
  style,
}: {
  children?: React.ReactNode;
  /** Ignored unless `material` is `tier`. */
  tier?: GlassTier;
  material?: GlassMaterial;
  radius?: number;
  /** Off for a nested plate: DESIGN.md's Tier 1 inside a card drops the outer
   *  drop shadow, or the card reads as two stacked objects. */
  shadow?: boolean;
  clip?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const p = usePalette();
  const { themeName } = useTheme();
  const isNight = themeName === 'night';
  const g = useMemo(() => {
    if (material === 'accent') return glassAccent(p, isNight);
    if (material === 'sheet') return glassSheet(p, isNight);
    return glassTier(p, tier, isNight);
  }, [p, tier, material, isNight]);
  const shadowStyle = useShadow();

  return (
    <View
      style={[
        {
          backgroundColor: g.fill,
          borderWidth: 1,
          borderColor: g.bd,
          borderTopColor: g.rim,
          borderRadius: radius,
        },
        shadow && shadowStyle,
        (clip || g.mountBlur) && styles.clip,
        style,
      ]}
    >
      {g.mountBlur && (
        <BlurView
          intensity={g.blurIntensity}
          tint={g.blurTint}
          pointerEvents="none"
          style={StyleSheet.absoluteFill}
        />
      )}
      {children}
    </View>
  );
}

/**
 * DESIGN.md's `0 8px 32px rgba(0,0,0,0.35)`, shared by every tier.
 *
 * On a translucent pane the shadow is doing the work the old opaque fill used
 * to: it is what separates a card from the sky behind it. Day's canvas is
 * light, so the same black at the same opacity would read as grime — it takes
 * the softer `0 8px 24px rgba(14,19,38,0.06)` the Day compositions draw.
 */
function useShadow() {
  const { themeName } = useTheme();
  return useMemo(
    () =>
      themeName === 'night'
        ? {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.35,
            shadowRadius: 32,
            elevation: 6,
          }
        : {
            shadowColor: '#0E1326',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.06,
            shadowRadius: 24,
            elevation: 3,
          },
    [themeName],
  );
}

const styles = StyleSheet.create({
  clip: { overflow: 'hidden' },
});

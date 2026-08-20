// ═══════════════════════════════════════════════════════════════════════════
// GLASS — the frosted-surface recipe, shared
// ═══════════════════════════════════════════════════════════════════════════
//
// The web's `styles/glass.css` derives every value from three params (blur 13,
// reflection 25%, depth 0) and the ratios below are that derivation: border
// 0.30r, top sheen 0.55r, bottom sheen 0.15r, specular line 0.80r, pressed fill
// = idle + 0.12 (the web's `--glass-fill-hover` step, which mobile spends on
// press because it has no hover).
//
// ── It inverts with the theme, and the web's does not ──────────────────────
// The web is pinned to Midnight, so its glass is one set of white-on-dark
// values. Mobile has two palettes, and a translucent film only reads if it
// darkens or lightens what scrolls under it: on Day's off-white canvas that
// means a **black** wash, on Night's near-black canvas a **white** one. Same
// ratios, opposite channel. `blurTint` and `lineEdge` follow the wash rather
// than the theme name, because both have to be the same channel as the fill —
// a white sheen fading to a transparent *black* stop picks up a grey halo.
//
// **This was extracted from `features/app-shell/Dock.tsx`**, which had it
// private, once buttons wanted the same material. The dock keeps its own
// pill values there: per the web, the dock is one always-on-screen element with
// its own tweak pass and must stay re-balanceable without touching the surfaces
// that share this recipe.
//
// ── Blur is not part of this ──────────────────────────────────────────────
// `glassWash` returns colours only. A live `BlurView` is expensive — the web
// file itself warns about ~50 concurrent backdrop filters — and at button size
// it contributes almost nothing: what reads as glass is the fill, the two
// sheens and the specular line. So **small controls take the texture without a
// blur**, and `BlurView` is reserved for the dock and sheets, which are large,
// few, and sit over moving content.

import type { Palette } from './tokens';

export type GlassWash = {
  /** Idle fill. */
  fill: string;
  /** Pressed fill — the web's hover step, spent on press here. */
  fillPressed: string;
  bd: string;
  sheenTop: string;
  sheenBottom: string;
  /** Specular line, brightest in the middle of the top edge. */
  lineMid: string;
  /** Zero-alpha form of `lineMid`'s channel. Never `transparent`, which is
   *  zero-alpha *black* and casts grey through a white ramp. */
  lineEdge: string;
  /** What `BlurView` tints toward — follows the wash, not the theme name. */
  blurTint: 'light' | 'dark';
};

/**
 * The wash for the active theme. `isNight` rather than reading the palette,
 * because the choice is about the canvas the film sits on, and two palettes
 * could one day share a direction.
 */
export function glassWash(p: Palette, isNight: boolean): GlassWash {
  return isNight
    ? {
        fill: 'rgba(255, 255, 255, 0.10)',
        fillPressed: 'rgba(255, 255, 255, 0.22)',
        bd: 'rgba(255, 255, 255, 0.30)',
        sheenTop: 'rgba(255, 255, 255, 0.14)',
        sheenBottom: 'rgba(255, 255, 255, 0.05)',
        lineMid: 'rgba(255, 255, 255, 0.32)',
        lineEdge: 'rgba(255, 255, 255, 0)',
        blurTint: 'dark',
      }
    : {
        fill: 'rgba(0, 0, 0, 0.06)',
        fillPressed: 'rgba(0, 0, 0, 0.14)',
        // Opaque, unlike Night's: a 30%-alpha black hairline over a white card
        // disappears, and this edge is what separates a glass control from the
        // paper behind it.
        bd: p.paperBd,
        sheenTop: 'rgba(0, 0, 0, 0.08)',
        sheenBottom: 'rgba(0, 0, 0, 0.03)',
        lineMid: 'rgba(0, 0, 0, 0.22)',
        lineEdge: 'rgba(0, 0, 0, 0)',
        blurTint: 'light',
      };
}

/** `--glass-blur: 13px`. `expo-blur` takes 1–100 rather than px; 13px of
 *  backdrop blur sits around here. The one value to tweak if a blurred surface
 *  reads too clear or too milky. */
export const BLUR_INTENSITY = 24;

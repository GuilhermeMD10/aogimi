/**
 * Glass surfaces, as class names.
 *
 * Same shape as `HAIRLINE` / `DASHED` next door, and for the same reason: the
 * recipe needs `::before` / `::after` (the two specular edge lines) and a
 * `:hover` fill, none of which a React component can express without either
 * inline styles that then lose to nothing, or duplicated markup on every call
 * site. So the recipe lives in `styles/glass.css` — which is also the one place
 * to tweak the look — and these are the greppable names for it.
 *
 * Compose with Tailwind for everything glass does NOT own: geometry, radius,
 * padding, type, colour. Utilities win over the recipe (it is in
 * `@layer components`), so a selected chip's `bg-(--btn)` overrides the glass
 * fill without `!important`.
 *
 *   <button className={cn(GLASS_BUTTON, 'rounded-(--radius-chip) px-3.5 py-2')}>
 *
 * All four resolve to the same underlying values today. They are four names
 * rather than one so a later "the chips should be lighter than the hero" is an
 * edit in glass.css, not a refactor out here.
 */

/** The hero panel: fill + blur, large inner glow, both specular edges. */
export const GLASS_SURFACE = 'glass-surface';

/**
 * Edge treatment laid over imagery — no fill, no blur. Renders as its own
 * absolutely-positioned element (`inset: 0`, inherits the parent's radius), so
 * the parent needs `position: relative` and its own `border-radius`.
 * `CoverTile`'s `sheen` prop is the usual way in.
 */
export const GLASS_SHEEN = 'glass-sheen';

/** Controls: filter chips, the import button, the ⋯ circles. Hover brightens. */
export const GLASS_BUTTON = 'glass-button';

/** The book card's slide-up hover panel. Top edge only, and no blur — see the
 *  note in glass.css for why. */
export const GLASS_SHEET = 'glass-sheet';

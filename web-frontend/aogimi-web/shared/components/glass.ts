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

/** The book card's slide-up hover panel. Top edge only. */
export const GLASS_SHEET = 'glass-sheet';

/**
 * Modifier, added ALONGSIDE `GLASS_BUTTON` or `GLASS_SURFACE` — never on its
 * own — for the dark variant of either:
 *
 *   <button className={cn(GLASS_BUTTON, GLASS_SCRIM, 'size-7 rounded-full')}>
 *
 * It swaps the white fill and glow for the same scrim the sheet uses. **Only for
 * glass that lands on cover art**, where a white circle disappears against a
 * pale cover — which is one call site, `BookMenu`'s `overArt`. The library used
 * to take it wholesale, on the argument that one screen wants one glass; it
 * still does, but that glass is now the dock's white one.
 */
export const GLASS_SCRIM = 'glass-scrim';

/**
 * A row in a ruled list, not a pane: nothing at rest, the glass fill on hover,
 * and it accepts `GLASS_ACTIVE` for the selected one. The dictionary rail's
 * results are the call site — a pane per row turns a list into a stack of cards.
 *
 * It draws no rule of its own. The line between rows belongs to the list, and
 * has to state its colour literally (`border-color` is not inherited, and the
 * base layer's `*` rule gives every element its own) — see `ROW_LIST`.
 */
export const GLASS_ROW = 'glass-row';

/**
 * Modifier, added ALONGSIDE `GLASS_BUTTON`, `GLASS_SURFACE` or `GLASS_ROW`: the
 * **selected** state. Swaps in the app-wide `--active` tint, the dark ink it carries, a
 * brighter edge and glow, and neutralises hover (a lit control has nothing to
 * brighten to). The dock's sliding pill is this same recipe.
 *
 *   <button className={cn(GLASS_BUTTON, GLASS_SCRIM, selected && GLASS_ACTIVE)}>
 *
 * Don't pair it with a `text-*` utility on the selected branch — utilities beat
 * the recipe, so that would override the ink this brings.
 */
export const GLASS_ACTIVE = 'glass-active';

/**
 * Modifier on `GLASS_BUTTON` for the study runner's grade row, paired with one
 * of the three tint classes below:
 *
 *   <button className={cn(GLASS_BUTTON, GLASS_PRESS, GLASS_GRADE, GLASS_GRADE_AGAIN)}>
 *
 * The one glass in the app whose **specular layers take the tint too**, not just
 * its fill. Three tiles sit side by side carrying neutral ink, so hue is the
 * whole signal and a white edge would dilute it — see the grade block in
 * `glass.css`. Don't copy the exception onto a surface that isn't one of these.
 *
 * It brings no ink of its own: set `text-(--ink)` on the button, which is also
 * what the hover edge resolves to (`currentColor`).
 */
export const GLASS_GRADE = 'glass-grade';

/** Again — `#ff5757`. Deliberately not `--danger`; the tints are local. */
export const GLASS_GRADE_AGAIN = 'glass-grade-again';

/** Hard — `#ffd582`. Deliberately not `--warn`. */
export const GLASS_GRADE_HARD = 'glass-grade-hard';

/** Easy — `#7ee29a`, the palette's only green and local to this row. */
export const GLASS_GRADE_EASY = 'glass-grade-easy';

/**
 * The press nudge — `translateY(1px) scale(.985)` for 120ms while held. Opt in
 * per button, on anything a user presses: it is deliberately not folded into
 * `GLASS_BUTTON`, because an element has exactly one `transform` and some
 * already spend theirs (the book card lifts on hover).
 *
 * Works on non-glass buttons too — it owns nothing but the transform. The one
 * catch is Tailwind's `transition-*` utilities: those win over the recipe, so a
 * button with e.g. `transition-colors` needs transform in its own list
 * (`transition-[color,transform]`) or the nudge snaps instead of easing.
 */
export const GLASS_PRESS = 'glass-press';

/**
 * Pane recipes, as class names.
 *
 * The recipes live in `styles/glass.css` (and only compose tokens from
 * `ds-tokens.css`, which is what makes Night turn the same classes into
 * glass); these are the greppable names for them. Compose with Tailwind for
 * everything a pane does NOT own — radius, padding, type, colour. Utilities
 * win over the recipe (it is in `@layer components`).
 *
 *   <button className={cn(PANE, PRESS, 'h-11 rounded-full px-[22px]')}>
 */

/** A white pill / card / chip: `--pane` fill, `--pane-bd` edge, `--shadow-pill`. */
export const PANE = 'pane';

/** The top nav's tier — the one blurred pane on a page. */
export const PANE_NAV = 'pane-nav';

/** The modal panel: `--pane-strong`, `--blur-modal`, `--shadow-modal`. */
export const PANE_MODAL = 'pane-modal';

/**
 * The press nudge — `scale(.97)` over `--transition` while held. Opt in per
 * control. Tailwind's `transition-*` utilities replace the recipe's list, so a
 * control with e.g. `transition-colors` needs `transform` in its own list
 * (`transition-[color,transform]`) or the nudge snaps.
 */
export const PRESS = 'press';

/**
 * The selected state — active nav item, active segment, selected chip. Reads
 * `--selected` / `--selected-ink`, which is the soft accent wash + accent ink
 * on the light themes and a solid accent fill + dark ink on Night. Plain
 * utilities rather than a recipe, so `cn()` can merge it against an
 * unselected branch's `text-*` without either surviving by accident.
 */
export const ACTIVE = 'bg-(--selected) text-(--selected-ink)';

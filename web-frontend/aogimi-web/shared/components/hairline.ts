/**
 * Visible edges, for the places that genuinely need one.
 *
 * `--bd` and `--card-border` are transparent by design on the redesign — shadow
 * and layout do the separating, not a filled surface with an edge. But a few
 * things are *affordances* rather than decoration and read as nothing without a
 * line: a dropzone, a ghost tile waiting for a file, the top edge of a card's
 * hover panel, a toolbar's lower boundary, a popover against the page.
 *
 * These mix their line out of `--muted` instead of adding a colour token. A
 * fixed hex would be wrong in one of the two themes; deriving it from a token
 * keeps it correct in both, and keeps the palette from growing a name that only
 * ever means "draw a faint line here".
 *
 * Usage: pair with Tailwind's own border utilities, which supply the width and
 * style — `cn('border', HAIRLINE)`, `cn('border-2 border-dashed', DASHED)`.
 */
export const HAIRLINE = '[border-color:color-mix(in_srgb,var(--muted)_35%,transparent)]';

/** Heavier, for dashed outlines that have to read as a target across a gap. */
export const DASHED = '[border-color:color-mix(in_srgb,var(--muted)_55%,transparent)]';

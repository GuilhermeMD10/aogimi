/**
 * General components — the app's primitive layer.
 *
 * One home for the pieces every screen shares, so they stay coherent with each
 * other. All of them read the tokens in `styles/ds-tokens.css` and none knows
 * anything about a theme: the palette swaps under them, so there is never a
 * light variant and a dark variant of the same component.
 *
 * The rule for what earns a place here: it appears at least twice. A one-off
 * stays in the feature that uses it and moves here when something else wants
 * it. `shared/ui/` is gone; new primitives go here, bespoke glyphs in
 * `shared/icons/`.
 */

// ── Shell ───────────────────────────────────────────────────────────────────
export { StarField } from './StarField';
export { Modal } from './Modal';

// ── Controls ────────────────────────────────────────────────────────────────
export { Button } from './Button';
export { Kbd } from './Kbd';
export { ProgressBar } from './ProgressBar';
export { Segmented } from './Segmented';
export type { SegmentedItem } from './Segmented';
export { SearchBar } from './SearchBar';

// ── Text ────────────────────────────────────────────────────────────────────
export { Eyebrow } from './Eyebrow';
export { Chip } from './Chip';
export { JlptChip } from './JlptChip';
export { StageDot, stageColor, stageLabel } from './StageDot';
export type { Stage } from './StageDot';

// ── Surfaces ────────────────────────────────────────────────────────────────
export { HeroCard } from './HeroCard';
export { CoverTile } from './CoverTile';
export type { CoverColors } from './CoverTile';
export { Skeleton } from './Skeleton';
export { SkyBar } from './SkyBar';
export { PANE, PANE_NAV, PANE_MODAL, PRESS, ACTIVE } from './glass';

// Outgoing — re-tokened in Phase 1, deleted with their callers' sessions
// (PLAN §2.7, §4). `SectionCard` replaces both cards.
export { PaperCard, PAPER_GHOST } from './PaperCard';
export { GlassCard, GLASS_GHOST } from './GlassCard';

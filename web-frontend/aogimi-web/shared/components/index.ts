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
 * it. `shared/ui/` holds the remaining shadcn/radix primitives — don't add
 * to it; new primitives go here.
 */

export { Button } from './Button';
export { CoverTile } from './CoverTile';
export { Eyebrow } from './Eyebrow';
export { JlptChip } from './JlptChip';
export { PaperCard, PAPER_GHOST } from './PaperCard';
export { GlassCard, GLASS_GHOST } from './GlassCard';
export { ProgressTrack } from './ProgressTrack';
export { Skeleton } from './Skeleton';
export { SkyBar } from './SkyBar';
export { HAIRLINE, DASHED } from './hairline';
export {
  GLASS_SURFACE,
  GLASS_SHEEN,
  GLASS_BUTTON,
  GLASS_SHEET,
  GLASS_ROW,
  GLASS_SCRIM,
  GLASS_ACTIVE,
  GLASS_PRESS,
  GLASS_GRADE,
  GLASS_GRADE_AGAIN,
  GLASS_GRADE_HARD,
  GLASS_GRADE_GOOD,
  GLASS_GRADE_EASY,
} from './glass';
export { StageDot, stageColor, stageLabel } from './StageDot';
export type { Stage } from './StageDot';
export { coverPalette } from './coverPalette';
export type { CoverColors } from './coverPalette';

/**
 * The handoff's bespoke glyphs — the ones `lucide-react` does not draw the
 * way the canvases do. 2px stroke, round caps, `currentColor`.
 */

type IconProps = { size?: number; className?: string };

/** The back chevron: `M12 4l-6 6 6 6` in a 20×20 viewBox (README → Shape). */
export function BackIcon({ size = 20, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden className={className}>
      <path d="M12 4l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** "More": three 4px dots stacked vertically, 3px apart. */
export function MoreIcon({ size = 18, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="currentColor" aria-hidden className={className}>
      <circle cx="9" cy="2" r="2" />
      <circle cx="9" cy="9" r="2" />
      <circle cx="9" cy="16" r="2" />
    </svg>
  );
}

/** Close: the modal's 14px "×". */
export function CloseIcon({ size = 14, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" aria-hidden className={className}>
      <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/** The star on "Add to sky" — filled, five points. */
export function StarIcon({ size = 15, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
      <path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.4l-5.9 3.2 1.3-6.6L2.5 9.4l6.6-.8L12 2.5z" />
    </svg>
  );
}

/** The ring-play on "Resume Reading": a 1.5px ring with a small play triangle. */
export function PlayRingIcon({ size = 22, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 22 22" fill="none" aria-hidden className={className}>
      <circle cx="11" cy="11" r="10" stroke="currentColor" strokeWidth="1.5" />
      <path d="M9 7.5v7l5.5-3.5L9 7.5z" fill="currentColor" />
    </svg>
  );
}

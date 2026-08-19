import { cn } from '@/lib/util/cn';

type Props = {
  /** 0–100. Clamped. */
  percent: number;
  /** Print the percentage inside the bar, at the left. The reader toolbar does;
   *  the library hero states it in a mono row above instead. */
  showLabel?: boolean;
  /** Height and width are the caller's — 26px tall either way, but the hero
   *  spans its column and the reader toolbar is a fixed 240px. */
  className?: string;
};

// Reading progress as a night sky being uncovered, not a bar being filled: the
// unread remainder is a pale veil over the stars, and reading pulls it back.
//
// The four colours are hardcoded rather than tokenised. They keep the same
// values in both themes on purpose — "the sky is the sky" — so there is
// nothing here for a theme to swap, and a token would only add a name that
// always resolves to one value.
//
// The width isn't animated. Progress changes as pages turn, so on the library
// shelf the new value *is* the first paint, and in the reader an animation
// chasing every page turn would be the loudest thing on a deliberately quiet
// screen.
const FILL = '#0e0e12';
const VEIL = 'rgba(206,216,234,.6)';
const VEIL_EDGE = '#aeb9cf';
const LABEL = '#f4e6b8';
const STARS = [
  'radial-gradient(1.4px 1.4px at 7% 30%, #f6e9bd 50%, transparent 51%)',
  'radial-gradient(1.1px 1.1px at 18% 62%, #f6e9bd 50%, transparent 51%)',
  'radial-gradient(1.5px 1.5px at 29% 22%, #f6e9bd 50%, transparent 51%)',
  'radial-gradient(1px 1px at 41% 70%, #f6e9bd 50%, transparent 51%)',
  'radial-gradient(1.3px 1.3px at 53% 34%, #f6e9bd 50%, transparent 51%)',
  'radial-gradient(1.1px 1.1px at 66% 66%, #f6e9bd 50%, transparent 51%)',
  'radial-gradient(1.4px 1.4px at 78% 26%, #f6e9bd 50%, transparent 51%)',
  'radial-gradient(1px 1px at 90% 58%, #f6e9bd 50%, transparent 51%)',
].join(', ');

export function SkyBar({ percent, showLabel = false, className }: Props) {
  const clamped = Math.max(0, Math.min(100, percent));

  return (
    <div
      aria-hidden
      className={cn('relative h-[26px] overflow-hidden rounded-(--radius-tile)', className)}
      style={{ backgroundColor: FILL, backgroundImage: STARS }}
    >
      <div
        className="absolute inset-y-0 right-0 border-l border-dashed"
        style={{
          width: `${100 - clamped}%`,
          background: VEIL,
          borderColor: VEIL_EDGE,
        }}
      />

      {showLabel && (
        <span
          className="absolute top-1/2 left-2.5 -translate-y-1/2 font-[family-name:var(--face-mono)] text-[10px] tracking-[0.04em]"
          style={{ color: LABEL }}
        >
          {Math.round(clamped)}%
        </span>
      )}
    </div>
  );
}

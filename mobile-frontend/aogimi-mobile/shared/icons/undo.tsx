import Svg, { Path } from 'react-native-svg';

/**
 * **Undo** — DESIGN.md's drawn glyph: an arrow doubling back on itself, at the
 * handoff's 2.2 stroke with round caps and joins.
 *
 * Drawn rather than taken from Feather because the set's nearest neighbours
 * both say something else: `rotate-ccw` is a full circular arrow (refresh, not
 * step-back) and `corner-up-left` turns *up* where this one turns down and
 * back. The study session's undo steps one card backwards, and this is the
 * mark the handoff specifies for it.
 */
export function UndoIcon({ size = 18, color }: { size?: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M9 14L4 9l5-5"
        stroke={color}
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M4 9h10a6 6 0 010 12h-3"
        stroke={color}
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

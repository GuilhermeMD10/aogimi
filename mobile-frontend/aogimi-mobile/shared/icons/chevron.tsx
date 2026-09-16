import Svg, { Path } from 'react-native-svg';

/**
 * **The app-wide back chevron.**
 *
 * DESIGN.md gives it as a path rather than a name: `M12 4l-6 6 6 6` in a 20×20
 * box, stroke 2.2, round caps and joins. Feather's `chevron-left` is the same
 * shape at a different weight and in a 24×24 box, so the two do not line up
 * when they sit side by side — which they do, in the reader's top bar and every
 * pushed screen's header. This is the drawn one, so there is a single chevron.
 */
export function ChevronLeftIcon({ size = 20, color }: { size?: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Path
        d="M12 4l-6 6 6 6"
        stroke={color}
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** The same glyph pointing down — a disclosure caret on a chip or a row. */
export function ChevronDownIcon({ size = 20, color }: { size?: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Path
        d="M5 7.5l5 5 5-5"
        stroke={color}
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

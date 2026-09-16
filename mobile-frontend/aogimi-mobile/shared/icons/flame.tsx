import Svg, { Path } from 'react-native-svg';

/**
 * The streak flame, from the handoff's Home header.
 *
 * One of the few glyphs the design draws that Feather does not ship — Feather
 * has no flame — so it lives here as a path rather than being approximated with
 * `zap` or `activity`, both of which mean something else. Filled rather than
 * stroked, which is how the composition draws it.
 */
export function FlameIcon({ size = 14, color }: { size?: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill={color}>
      <Path d="M10 2c.3 2 1.8 3.2 3 4.6 1.1 1.4 1.8 2.8 1.8 4.4a4.8 4.8 0 01-9.6 0c0-1 .2-1.8.6-2.6.2.9.8 1.5 1.5 1.5.9 0 1.5-.7 1.3-1.6C7.9 6.8 8.6 3.8 10 2z" />
    </Svg>
  );
}

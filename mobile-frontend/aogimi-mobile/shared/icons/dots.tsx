import { StyleSheet, View } from 'react-native';

/**
 * **The "more" glyph, and the reader dock's grip: three dots.**
 *
 * DESIGN.md draws it as geometry, not a typeface — "three 4px dots, gap 3px" —
 * and that is why it is not `⋯` in a `Text`. A middle-dot character is laid out
 * by the font: its size, spacing and optical centre are Switzer's business, so
 * it drifted off-centre in the 24pt circle it had to sit in and came out a
 * different weight from the icons beside it. Three views are exactly 4pt each,
 * exactly 3pt apart, and centre where they are put.
 *
 * `size` is the dot diameter, so the same component draws the 44pt header
 * button's dots and the 24pt cover overlay's smaller ones.
 */
export function MoreDotsIcon({
  size = 4,
  gap = 3,
  color,
  direction = 'row',
}: {
  size?: number;
  gap?: number;
  color: string;
  /** `column` for a vertical ⋮ — a row's trailing affordance. */
  direction?: 'row' | 'column';
}) {
  return (
    <View style={[styles.row, { flexDirection: direction, gap }]}>
      {[0, 1, 2].map((i) => (
        <View
          key={i}
          style={{
            width: size,
            height: size,
            // A dot, by definition — half its own box, not a token radius.
            borderRadius: size / 2,
            backgroundColor: color,
          }}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { alignItems: 'center', justifyContent: 'center' },
});

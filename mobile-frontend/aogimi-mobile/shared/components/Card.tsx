import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { radius, spacing } from '@/theme/tokens';
import { Glass } from './Glass';

/**
 * The app's card — **Tier 2 glass, radius 16, padding 16, with the drop
 * shadow.** DESIGN.md's "Cards": a pane that floats over the sky.
 *
 * `padded={false}` for a card whose children run edge to edge: a divided row
 * group needs its hairlines to touch both sides, so it supplies its own per-row
 * padding instead. Such a card should also carry `clip`, or square row corners
 * will poke past the rounded edge.
 */
export function Card({
  children,
  padded = true,
  clip = false,
  style,
}: {
  children: React.ReactNode;
  padded?: boolean;
  clip?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Glass tier={2} radius={radius.card} clip={clip} style={[padded && styles.padded, style]}>
      {children}
    </Glass>
  );
}

/**
 * A **Tier 1 plate nested inside a card** — an input at rest, a well, a passive
 * chip's ground. Radius 12 and **no drop shadow**: DESIGN.md is explicit that a
 * nested plate drops the outer shadow, because two shadows one inside the other
 * read as two separate objects rather than one card with a well in it.
 *
 * This is the other half of the "glass never sits on glass of the same tier"
 * rule — a card is Tier 2, so everything inside it is Tier 1.
 */
export function InnerPlate({
  children,
  style,
}: {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Glass tier={1} radius={radius.control} shadow={false} style={style}>
      {children}
    </Glass>
  );
}

const styles = StyleSheet.create({
  padded: { padding: spacing.cardPad },
});

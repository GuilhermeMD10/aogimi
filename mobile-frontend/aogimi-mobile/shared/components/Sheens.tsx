import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

/**
 * The lit edges of a glass surface: a 1px sheen along the top and the bottom,
 * and over the top one a horizontal gradient brightest in the middle — the
 * web's `::before` with `background-size: 100% 1px`.
 *
 * **Extracted from `features/app-shell/Dock.tsx`** when buttons took the same
 * material. It is inert (`pointerEvents="none"`) and absolutely filled, so it
 * drops into any surface without affecting layout or touch.
 *
 * The two surfaces in the dock light *differently*, which is why `lineEdge` is
 * a parameter and not a constant: it has to be the zero-alpha form of the same
 * channel as `lineMid`, or the gradient fades through a halo of the opposite
 * colour on its way out. `theme/glass.ts` returns the matching pair.
 */
export function Sheens({
  top,
  bottom,
  lineMid,
  lineEdge,
  radius,
}: {
  top: string;
  bottom: string;
  lineMid: string;
  /** Zero-alpha form of `lineMid`'s channel — see the note above. */
  lineEdge: string;
  radius?: number;
}) {
  return (
    <View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, radius !== undefined ? { borderRadius: radius } : null]}
    >
      <View style={[styles.hairline, { top: 0, backgroundColor: top }]} />
      <LinearGradient
        colors={[lineEdge, lineMid, lineEdge]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.hairline, { top: 0 }]}
      />
      <View style={[styles.hairline, { bottom: 0, backgroundColor: bottom }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  hairline: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
  },
});

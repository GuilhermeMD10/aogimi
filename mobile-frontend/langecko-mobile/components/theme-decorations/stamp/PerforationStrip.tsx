import { useMemo } from 'react';
import { View, type ViewStyle } from 'react-native';
import { useColors } from '@/theme/ThemeContext';

type Props = {
  side: 'top' | 'bottom';
  /** Width of the strip in pixels. The component will fit as many holes as
   *  possible at the spacing implied by `holeSize`. */
  width: number;
  /** Color shown through the holes — should match the page background
   *  behind the parent surface. Defaults to theme `bg`. */
  color?: string;
  holeSize?: number;
  spacing?: number;
  style?: ViewStyle;
};

/**
 * Stamp-theme decoration: a row of perforation holes along one edge.
 * Position the parent `relative` (the default in RN) and absolutely place
 * this strip half off the edge:
 *
 *   <View style={{ position: 'relative', overflow: 'visible' }}>
 *     ...stamp body...
 *     <PerforationStrip side="top" width={cardWidth} />
 *   </View>
 *
 * The strip sits half outside the parent so the holes appear to bite into
 * the surface.
 */
export function PerforationStrip({
  side,
  width,
  color,
  holeSize = 7,
  spacing = 3,
  style,
}: Props) {
  const c = useColors();
  const fillColor = color ?? c.bg;

  const dots = useMemo(() => {
    const stride = holeSize + spacing;
    const count = Math.max(1, Math.floor(width / stride));
    return Array.from({ length: count });
  }, [width, holeSize, spacing]);

  return (
    <View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          left: 0,
          right: 0,
          [side]: -Math.floor(holeSize / 2),
          height: holeSize,
          flexDirection: 'row',
          justifyContent: 'space-between',
          paddingHorizontal: spacing,
        },
        style,
      ]}
    >
      {dots.map((_, i) => (
        <View
          key={i}
          style={{
            width: holeSize,
            height: holeSize,
            borderRadius: holeSize / 2,
            backgroundColor: fillColor,
          }}
        />
      ))}
    </View>
  );
}

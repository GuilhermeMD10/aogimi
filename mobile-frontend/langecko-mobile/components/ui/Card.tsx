import { View, type ViewProps, type ViewStyle } from 'react-native';
import { useColors, useShape } from '@/theme/ThemeContext';

type Tone = 'elev' | 'sunken' | 'flat';

type Props = Omit<ViewProps, 'style'> & {
  tone?: Tone;
  /** When true, draws the surface shadow recipe from the active theme.
   *  Stamp uses a hard offset shadow; soft themes use a subtle drop. */
  elevated?: boolean;
  /** Override the resolved bg (e.g. for vermillion banners under Stamp). */
  background?: string;
  pad?: number;
  style?: ViewStyle;
};

/**
 * Theme-aware surface. Reads `shape.surface` so its border/radius/shadow
 * change with the active theme — soft + rounded under Default, crisp +
 * hard-shadowed under Stamp.
 */
export function Card({
  children,
  tone = 'elev',
  elevated = false,
  background,
  pad,
  style,
  ...rest
}: Props) {
  const c = useColors();
  const s = useShape().surface;

  const bg =
    background ??
    (tone === 'flat' ? c.bg : tone === 'sunken' ? c.bgSunken : c.bgElev);

  return (
    <View
      {...rest}
      style={[
        {
          backgroundColor: bg,
          borderColor: s.borderColor,
          borderWidth: s.borderWidth,
          borderRadius: s.radius,
          padding: pad,
        },
        elevated && {
          shadowColor: s.shadowColor,
          shadowOffset: s.shadowOffset,
          shadowOpacity: s.shadowOpacity,
          shadowRadius: s.shadowRadius,
          elevation: s.elevation,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

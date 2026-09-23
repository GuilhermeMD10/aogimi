import { useMemo } from 'react';
import { ActivityIndicator, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { Touchable } from './Touchable';
import { Glass } from './Glass';
import { ChevronLeftIcon, MoreDotsIcon } from '@/shared/icons';
import { usePalette, type GlassTier } from '@/theme';

/**
 * **The round icon button** — DESIGN.md's "Icon button": a 44pt circle of
 * Tier 2 glass with a 20pt stroke glyph, or a 36pt one in a dense top bar.
 *
 * Circles are reserved (DESIGN.md's shape rule): icon buttons, avatars, deck
 * nodes, stars. Anything with a label is a `Button` and is a 12px rectangle.
 *
 * ── `back` and `more` are built in ─────────────────────────────────────────
 * They are the two that appear in every header, and both are *drawn* glyphs
 * rather than Feather names — the back chevron because DESIGN.md specifies its
 * path and weight, the three dots because it specifies their geometry. Passing
 * `icon="chevron-left"` instead would put a second, differently-weighted
 * chevron in the app. Everything else takes a Feather name.
 *
 * The visual box **is** the hit area (see `Touchable`), which is why 44 is the
 * default: it is the target floor, not a decoration that needs slop.
 */
export type IconButtonGlyph = 'back' | 'more';

export function IconButton({
  glyph,
  icon,
  onPress,
  accessibilityLabel,
  size = 44,
  tier = 2,
  accent = false,
  disabled = false,
  loading = false,
  tone,
  style,
  children,
}: {
  /** One of the two built-in drawn glyphs. Mutually exclusive with `icon`. */
  glyph?: IconButtonGlyph;
  /** Any Feather glyph. Mutually exclusive with `glyph`. */
  icon?: React.ComponentProps<typeof Feather>['name'];
  onPress: () => void;
  accessibilityLabel: string;
  /** 44 in a header, 36 in the Sky top bar and the Library title row, 40 at
   *  the end of a dictionary result row (DESIGN.md's "40px circle `+`"). */
  size?: 44 | 40 | 36;
  tier?: GlassTier;
  /** Accent glass instead of the tier — an active or focused circle. */
  accent?: boolean;
  disabled?: boolean;
  /** Swaps the glyph for a spinner and blocks the press — a sync button that
   *  is mid-request. Same contract as `Button`'s. */
  loading?: boolean;
  /** Override the glyph's ink. Defaults to `ink`, or `accent` on accent glass. */
  tone?: string;
  style?: StyleProp<ViewStyle>;
  /** A drawn glyph of the caller's own — an SVG the icon set does not carry
   *  (the library's cloud-sync mark). Used only when neither `glyph` nor `icon`
   *  is given; the caller sizes and colours it. */
  children?: React.ReactNode;
}) {
  const p = usePalette();
  const ink = tone ?? (accent ? p.accent : p.ink);
  // 20pt glyph in the 44pt circle, 18pt in the 36pt one — DESIGN.md's figures,
  // and the ratio that keeps the glyph from crowding the smaller circle. The
  // 40pt add circle draws its `+` at 16, as the dictionary compositions do.
  const glyphSize = size === 44 ? 20 : size === 40 ? 16 : 18;
  const box = useMemo(
    () => ({ width: size, height: size, borderRadius: size / 2 }),
    [size],
  );

  const isDisabled = disabled || loading;

  return (
    <Touchable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: isDisabled }}
      // The circle is already at or above the 44pt floor at every size once
      // the smaller variants' `hitSlop` is counted, and letting the floor apply
      // would turn them into 44pt squares.
      minTarget={false}
      hitSlop={(44 - size) / 2}
      style={[box, isDisabled && styles.disabled, style]}
    >
      <Glass
        material={accent ? 'accent' : 'tier'}
        tier={tier}
        radius={size / 2}
        style={[StyleSheet.absoluteFill, box]}
      />
      <View style={styles.centre}>
        {loading ? (
          <ActivityIndicator size="small" color={ink} />
        ) : glyph === 'back' ? (
          <ChevronLeftIcon size={glyphSize} color={ink} />
        ) : glyph === 'more' ? (
          <MoreDotsIcon color={ink} />
        ) : icon ? (
          <Feather name={icon} size={glyphSize} color={ink} />
        ) : (
          children ?? null
        )}
      </View>
    </Touchable>
  );
}

const styles = StyleSheet.create({
  // The glass is an absolute sibling rather than the wrapper, so the pane keeps
  // its own drop shadow (which `overflow: hidden` on a clipping parent would
  // eat) while the glyph centres over it.
  centre: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.4 },
});

import { useMemo } from 'react';
import { ActivityIndicator, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { Touchable } from './Touchable';
import { usePalette } from '@/theme/ThemeContext';
import { radius, spacing, type, type Palette } from '@/theme/tokens';

/**
 * **Every button in the app.** DESIGN.md's four variants, one 48pt control with
 * a 12px radius — there are no 999px pills on controls any more.
 *
 *   · `primary`     sakura fill, `#2A1A24` ink, and the sakura glow under it.
 *                   The one loud thing on a screen; a card has at most one.
 *   · `secondary`   Tier 2 glass with ink text. Optional leading icon in accent.
 *   · `tertiary`    text only, in accent, with no surface at all.
 *   · `destructive` danger tint, danger border, danger ink, trash icon.
 *
 * `size="small"` is DESIGN.md's "small glass action": 36pt, Tier 1 glass, 12px
 * label — `Explore ›`, `List`, `View all`. It applies to every variant, so a
 * small primary is a real thing rather than a fork.
 *
 * ── The count badge ────────────────────────────────────────────────────────
 * `badge` is the trailing pill on a primary CTA (`48 DUE`). It flips the row to
 * `space-between`, which is what pushes the label left and the count right —
 * DESIGN.md specifies exactly that, and it is why the badge is a prop rather
 * than something a caller composes into `label`.
 */
export type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'destructive';

export type ButtonProps = {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  /** 36pt Tier 1 instead of the 48pt control. */
  size?: 'default' | 'small';
  /** Leading 16px Feather glyph. Inherits the variant's ink, except on
   *  `secondary`, where DESIGN.md puts it in accent. */
  icon?: React.ComponentProps<typeof Feather>['name'];
  /** Trailing count badge on a CTA — `48 DUE`. Primary only; the other
   *  variants are not loud enough to carry one. */
  badge?: string;
  full?: boolean;
  loading?: boolean;
  disabled?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'default',
  icon,
  badge,
  full,
  loading,
  disabled,
  accessibilityLabel,
  style,
}: ButtonProps) {
  const p = usePalette();
  const s = useStyles(p);
  const isDisabled = disabled || loading;
  const small = size === 'small';

  // Secondary and small take the glass wash; primary keeps its solid sakura
  // face (glass over a saturated fill only muddies it), and the other two draw
  // their own tint and border.
  const glass = variant === 'secondary' || (small && variant !== 'primary' && variant !== 'destructive');

  const ink =
    variant === 'primary' ? p.btnInk : variant === 'destructive' ? p.danger : variant === 'tertiary' ? p.accent : p.ink;
  const iconInk = variant === 'secondary' ? p.accent : ink;

  return (
    <Touchable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: !!isDisabled }}
      // A destructive control should not tick like tapping a tab; its feedback
      // is the confirm dialog that follows it.
      haptic={variant !== 'destructive'}
      surface={glass ? 'glass' : 'none'}
      radius={radius.control}
      // The control is 48pt (or 36pt) from its own height; the 44pt floor would
      // only add width to a `tertiary` sitting inline.
      minTarget={false}
      style={[
        s.base,
        small ? s.small : s.tall,
        variant === 'primary' && s.primary,
        variant === 'destructive' && s.destructive,
        variant === 'tertiary' && s.tertiary,
        badge !== undefined && s.spread,
        full && s.full,
        isDisabled && s.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={ink} />
      ) : (
        <>
          <View style={s.lead}>
            {(icon || variant === 'destructive') && (
              <Feather name={icon ?? 'trash-2'} size={16} color={iconInk} />
            )}
            <Text style={[small ? s.labelSmall : s.label, { color: ink }]} numberOfLines={1}>
              {label}
            </Text>
          </View>
          {badge !== undefined && <Text style={s.badge}>{badge}</Text>}
        </>
      )}
    </Touchable>
  );
}

function useStyles(p: Palette) {
  return useMemo(
    () =>
      StyleSheet.create({
        base: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: radius.control,
          paddingHorizontal: spacing.xl - 2,
        },
        tall: { height: 48 },
        small: { height: 36, paddingHorizontal: spacing.md },
        full: { width: '100%' },
        /** `space-between` is what a trailing badge is for — see the header. */
        spread: { justifyContent: 'space-between' },

        primary: {
          backgroundColor: p.btn,
          // DESIGN.md's `0 8px 24px rgba(242,184,198,0.28)`. The glow is the
          // reason primary reads as lit rather than merely filled.
          shadowColor: p.glowPrimary,
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 1,
          shadowRadius: 24,
          elevation: 4,
        },
        destructive: {
          backgroundColor: p.dangerBg,
          borderWidth: 1,
          borderColor: p.dangerBd,
        },
        tertiary: { paddingHorizontal: spacing.md },
        disabled: { opacity: 0.4 },

        /** Icon and label move together, so a leading glyph never drifts from
         *  its text when the row spreads for a badge. */
        lead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
        label: type.labelButton,
        labelSmall: { ...type.labelButton, fontSize: 12 },

        badge: {
          ...type.monoMeta,
          fontWeight: '700',
          color: p.btnInk,
          // The badge is always on the sakura face, so its ground is a wash of
          // the button's own ink rather than a palette token.
          backgroundColor: 'rgba(42, 26, 36, 0.15)',
          borderRadius: radius.chip,
          paddingHorizontal: spacing.sm,
          paddingVertical: 3,
          overflow: 'hidden',
        },
      }),
    [p],
  );
}

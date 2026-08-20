import { forwardRef, useMemo } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { Touchable } from '@/shared/components/Touchable';
import { usePalette } from '@/theme/ThemeContext';
import { fontFamily, fontSize, radius, spacing, type Palette } from '@/theme/tokens';

/** The bar's vertical padding, needed twice: once as padding, once negated so
 *  the clear segment can span the full height. */
const PAD_V = spacing.md + 3;
const PAD_V_COMPACT = spacing.sm + 2;

/**
 * The one search input, shared by the dictionary tab and the reader's drawer.
 *
 * Two looks, as the handoff draws them: at rest a `paperBd` hairline on the card
 * fill, and **once there is a query, an `ink` border** — the field is the page's
 * subject while results are showing, so it gains weight rather than losing it.
 * The handoff also blinks a vermillion caret in the resting state; that is a
 * prototype standing in for a real cursor, and a live `TextInput` already draws
 * one (tinted `accent` here).
 *
 * ── The clear control is part of the bar, not a button floating in it ───────
 * It was a 20×20 pill with `hitSlop` — a 40pt target inside a 52pt bar, and
 * invisible slop meant people still aimed at the 20px they could see. It is now
 * a **full-height segment** at the trailing edge with its own hairline divider:
 * the bar's own height *is* the target, and the divider says the segment is a
 * separate control rather than an icon sitting in the text.
 *
 * The field never calls `focus()` on itself. Tapping it is the only thing that
 * raises the keyboard — see `useSearchKeyboard`.
 */
export const SearchField = forwardRef<TextInput, {
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  /** Draw the `ink` border. Callers pass "there is a query". */
  active?: boolean;
  compact?: boolean;
  /** Return key. The parent dismisses; RN's own blur-on-submit is not relied on. */
  onSubmit?: () => void;
  /** Accessibility label for the clear segment. */
  clearLabel: string;
}>(function SearchField(
  { value, onChangeText, placeholder, active = false, compact = false, onSubmit, clearLabel },
  ref,
) {
  const p = usePalette();
  const styles = useStyles(p);

  return (
    <View
      style={[
        styles.field,
        compact && styles.fieldCompact,
        active ? styles.fieldActive : styles.fieldResting,
      ]}
    >
      <Feather name="search" size={compact ? 16 : 18} color={p.accent} />
      <TextInput
        ref={ref}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={p.faint}
        // The query is Japanese far more often than not, and a Latin face would
        // fall back mid-string on a mixed query. `jp` renders both.
        style={[styles.input, compact && styles.inputCompact]}
        selectionColor={p.accent}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        onSubmitEditing={onSubmit}
        submitBehavior="blurAndSubmit"
      />
      {value.length > 0 && (
        <Touchable
          onPress={() => onChangeText('')}
          accessibilityRole="button"
          accessibilityLabel={clearLabel}
          // The segment is as tall as the bar, so the 44pt floor would only add
          // width it does not need; `minWidth` still applies through the padding.
          minTarget={false}
          nudge={false}
          style={[styles.clear, compact && styles.clearCompact]}
        >
          <Feather name="x" size={compact ? 14 : 16} color={p.soft} />
        </Touchable>
      )}
    </View>
  );
});

function useStyles(p: Palette) {
  return useMemo(
    () =>
      StyleSheet.create({
        field: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm + 3,
          backgroundColor: p.paper,
          borderRadius: radius.lg,
          borderWidth: 1.5,
          paddingLeft: spacing.lg + 1,
          // No right padding: the clear segment reaches the trailing edge, and
          // supplies its own. `overflow` keeps it inside the rounded corner.
          paddingVertical: PAD_V,
          overflow: 'hidden',
        },
        fieldCompact: {
          gap: spacing.sm,
          borderRadius: radius.md,
          paddingLeft: spacing.md,
          paddingVertical: PAD_V_COMPACT,
        },
        fieldResting: { borderColor: p.paperBd },
        fieldActive: { borderColor: p.ink },
        input: {
          flex: 1,
          fontFamily: fontFamily.jp,
          fontSize: fontSize.md,
          color: p.ink,
          // RN gives an input its own vertical padding on Android; zeroing it
          // keeps the field the height the paddings above say it is.
          padding: 0,
        },
        inputCompact: { fontSize: fontSize.sm + 1 },

        clear: {
          alignItems: 'center',
          justifyContent: 'center',
          alignSelf: 'stretch',
          paddingHorizontal: spacing.md + 2,
          // Cancels the bar's vertical padding so the segment runs the full
          // height — the whole point of moving it out of the text run.
          marginVertical: -PAD_V,
          borderLeftWidth: 1,
          borderLeftColor: p.paperBd,
        },
        clearCompact: {
          paddingHorizontal: spacing.md,
          marginVertical: -PAD_V_COMPACT,
        },
      }),
    [p],
  );
}

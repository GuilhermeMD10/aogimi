import { forwardRef, useMemo } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { usePalette } from '@/theme/ThemeContext';
import { fontFamily, fontSize, radius, spacing, type Palette } from '@/theme/tokens';

/**
 * The one search input, shared by the dictionary tab and the reader's drawer.
 *
 * Two looks: at rest a `paperBd` hairline on the card fill, and **once there
 * is a query, an `ink` border** — the field is the page's subject while
 * results are showing, so it gains weight rather than losing it. The caret is
 * the live `TextInput`'s own, tinted `accent`.
 *
 * `compact` is the drawer's step-down: same component, smaller box, because the
 * reader sheet is 65% of a phone and the tab's padding would eat the results.
 */
export const SearchField = forwardRef<TextInput, {
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  /** Draw the `ink` border. Callers pass "there is a query". */
  active?: boolean;
  compact?: boolean;
  autoFocus?: boolean;
  /** Accessibility label for the clear button. */
  clearLabel: string;
}>(function SearchField(
  { value, onChangeText, placeholder, active = false, compact = false, autoFocus, clearLabel },
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
        autoFocus={autoFocus}
        returnKeyType="search"
      />
      {value.length > 0 && (
        <Pressable
          onPress={() => onChangeText('')}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={clearLabel}
          style={styles.clear}
        >
          <Feather name="x" size={11} color={p.soft} />
        </Pressable>
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
          paddingHorizontal: spacing.lg + 1,
          paddingVertical: spacing.md + 3,
        },
        fieldCompact: {
          gap: spacing.sm,
          borderRadius: radius.md,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm + 2,
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
          width: 20,
          height: 20,
          borderRadius: radius.sm,
          backgroundColor: p.paperBd,
          alignItems: 'center',
          justifyContent: 'center',
        },
      }),
    [p],
  );
}

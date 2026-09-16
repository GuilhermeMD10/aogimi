import { forwardRef, useCallback, useMemo, useRef } from 'react';
import { StyleSheet, TextInput, type StyleProp, type ViewStyle } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { InnerPlate } from '@/shared/components/Card';
import { Touchable } from '@/shared/components/Touchable';
import { usePalette } from '@/theme/ThemeContext';
import { spacing, type, type Palette } from '@/theme/tokens';

/** DESIGN.md's search field: a 48pt control. */
const FIELD_H = 48;

/**
 * The dictionary's search input, shared by the tab and the reader's drawer.
 *
 * DESIGN.md's field — 48pt, radius 12, Tier 1 glass, a 16px search glyph in
 * `faint`, the JP face for the text — with **the clear segment and the keyboard
 * rule kept exactly as they were**, which is why this is not
 * `shared/components/SearchField`:
 *
 * ── The clear control is part of the bar, not a button floating in it ───────
 * A **full-height segment** at the trailing edge with its own hairline divider:
 * the bar's own height *is* the target, and the divider says the segment is a
 * separate control rather than an icon sitting in the text.
 *
 * **Clearing focuses.** The segment empties the field *and* raises the
 * keyboard, because "clear" is only ever the start of typing the next query —
 * leaving the user on an empty field with no keyboard makes them tap twice to
 * do the one thing an empty field is for. It is the only `focus()` in the
 * feature; everything else follows `useSearchKeyboard`'s rule.
 */
export const SearchField = forwardRef<TextInput, {
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  /** Return key. The parent dismisses; RN's own blur-on-submit is not relied on. */
  onSubmit?: () => void;
  /** Accessibility label for the clear segment. */
  clearLabel: string;
  style?: StyleProp<ViewStyle>;
}>(function SearchField({ value, onChangeText, placeholder, onSubmit, clearLabel, style }, ref) {
  const p = usePalette();
  const styles = useStyles(p);

  // The clear segment has to focus the input, and the caller owns the ref, so
  // this keeps a second handle on the same node and forwards through to
  // whatever the caller passed — object ref or callback.
  const inputRef = useRef<TextInput | null>(null);
  const attachRef = useCallback(
    (node: TextInput | null) => {
      inputRef.current = node;
      if (typeof ref === 'function') ref(node);
      else if (ref) ref.current = node;
    },
    [ref],
  );

  return (
    <InnerPlate style={[styles.field, style]}>
      <Feather name="search" size={16} color={p.faint} />
      <TextInput
        ref={attachRef}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={p.faint}
        style={styles.input}
        selectionColor={p.accent}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        onSubmitEditing={onSubmit}
        submitBehavior="blurAndSubmit"
      />
      {value.length > 0 && (
        <Touchable
          onPress={() => {
            onChangeText('');
            inputRef.current?.focus();
          }}
          accessibilityRole="button"
          accessibilityLabel={clearLabel}
          // The segment is as tall as the bar, so the 44pt floor would only add
          // width it does not need; `minWidth` still applies through the padding.
          minTarget={false}
          nudge={false}
          style={styles.clear}
        >
          <Feather name="x" size={16} color={p.muted} />
        </Touchable>
      )}
    </InnerPlate>
  );
});

function useStyles(p: Palette) {
  return useMemo(
    () =>
      StyleSheet.create({
        field: {
          height: FIELD_H,
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm + 2,
          paddingLeft: spacing.lg,
          // No right padding: the clear segment reaches the trailing edge and
          // supplies its own.
        },
        input: {
          ...type.bodyMd,
          // Queries are Japanese far more often than not; the JP face renders
          // both scripts where a Latin face falls back mid-string.
          fontFamily: type.titleReading.fontFamily,
          color: p.ink,
          flex: 1,
          // RN gives an input its own vertical padding on Android; zeroing it
          // keeps the field the height the plate says it is.
          padding: 0,
        },
        clear: {
          alignItems: 'center',
          justifyContent: 'center',
          // Runs the full height of the plate — the whole point of moving it
          // out of the text run.
          alignSelf: 'stretch',
          paddingHorizontal: spacing.md + 2,
          borderLeftWidth: 1,
          borderLeftColor: p.glassBorder,
        },
      }),
    [p],
  );
}

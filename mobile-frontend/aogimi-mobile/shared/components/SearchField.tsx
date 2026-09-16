import { useMemo, useRef } from 'react';
import { StyleSheet, TextInput, type StyleProp, type ViewStyle } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { InnerPlate } from './Card';
import { Touchable } from './Touchable';
import { usePalette } from '@/theme/ThemeContext';
import { spacing, type, type Palette } from '@/theme/tokens';

/** DESIGN.md's search field: a 48pt control. */
const FIELD_H = 48;

/**
 * **The search field** — DESIGN.md's: 48pt, radius 12, Tier 1 glass, a 16px
 * search glyph in `faint`, and a JP-face placeholder.
 *
 * Tier 1 because it is a plate: on the canvas at `screenX` or inside a card,
 * it is always the well you type into rather than the surface you read. The
 * clear control appears only once there is a query, and **clearing refocuses**
 * — an empty field with no keyboard makes the next search two taps.
 *
 * The dictionary tab still has its own field (`features/dictionary/components/
 * SearchField`, an older look with the `ink` active border). That is the
 * dictionary session's to reconcile; this is the primitive it reconciles onto.
 */
export function SearchField({
  value,
  onChangeText,
  placeholder,
  clearLabel,
  onSubmit,
  autoFocus,
  style,
}: {
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  /** Accessibility label for the clear control. */
  clearLabel: string;
  onSubmit?: () => void;
  autoFocus?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const p = usePalette();
  const s = useStyles(p);
  const inputRef = useRef<TextInput | null>(null);

  return (
    <InnerPlate style={[s.field, style]}>
      <Feather name="search" size={16} color={p.faint} />
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={p.faint}
        style={s.input}
        selectionColor={p.accent}
        autoCapitalize="none"
        autoCorrect={false}
        autoFocus={autoFocus}
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
          minTarget={false}
          hitSlop={10}
          nudge={false}
          style={s.clear}
        >
          <Feather name="x" size={16} color={p.muted} />
        </Touchable>
      )}
    </InnerPlate>
  );
}

function useStyles(p: Palette) {
  return useMemo(
    () =>
      StyleSheet.create({
        field: {
          height: FIELD_H,
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm + 2,
          paddingHorizontal: spacing.md + 2,
        },
        input: {
          ...type.bodyMd,
          // Queries are Japanese far more often than not; the JP face renders
          // both scripts where a Latin face falls back mid-string.
          fontFamily: type.titleReading.fontFamily,
          color: p.ink,
          flex: 1,
          padding: 0,
        },
        clear: { paddingLeft: spacing.sm, alignSelf: 'stretch', justifyContent: 'center' },
      }),
    [p],
  );
}

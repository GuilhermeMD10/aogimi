import { useMemo, useState } from 'react';
import { StyleSheet, Text, TextInput, View, type StyleProp, type ViewStyle } from 'react-native';
import { Touchable } from './Touchable';
import { InnerPlate } from './Card';
import { usePalette } from '@/theme/ThemeContext';
import { spacing, type, type Palette } from '@/theme/tokens';

/** DESIGN.md's input: a 44pt control. `multiline` grows from it rather than
 *  being a different shape. */
const FIELD_H = 44;

type Props = {
  /** The eyebrow above the field — 10px uppercase, tracked. Omitted for a field
   *  whose label belongs to the group it sits in (one `MEANINGS` label over
   *  three inputs). */
  label?: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  /** Sets the input in the JP face — a headword, a reading, a book title. */
  japanese?: boolean;
  /** Ink in `accent` rather than `ink`, for a kana reading (the handoff sets
   *  the Add-card drawer's reading field in sakura). */
  accentInk?: boolean;
  /** Grows with its content — a context sentence. */
  multiline?: boolean;
  /** Rendered inside the plate, before the input: the numbered circle on a
   *  meaning row. */
  leading?: React.ReactNode;
  maxLength?: number;
  editable?: boolean;
  autoFocus?: boolean;
  secure?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  autoComplete?: 'username' | 'password' | 'new-password' | 'email' | 'off';
  /** Only the variants a form here actually asks for — `email-address` drives
   *  the `@`-bearing keyboard on the sign-up screen. */
  keyboardType?: 'default' | 'email-address';
  returnKeyType?: 'done' | 'next' | 'go' | 'search';
  onSubmitEditing?: () => void;
  style?: StyleProp<ViewStyle>;
};

/**
 * **A text input** — DESIGN.md's input at rest: a 44pt, 12px-radius plate of
 * Tier 1 glass under an optional eyebrow.
 *
 * Tier 1 because an input is the canonical nested plate: it always sits inside
 * a card or a sheet, which are Tier 2 and Tier 4, and glass never sits on glass
 * of its own tier. `InnerPlate` is that recipe, so this component owns the
 * label, the ink and the keyboard and nothing about the material.
 *
 * `japanese`, `accentInk` and `leading` exist because the Add-card drawer's
 * five fields are this field at five settings — a JP headword, a sakura kana
 * reading, three numbered glosses, and a JP sentence that wraps — rather than
 * five bespoke inputs. Keeping them here is what stops the next form that needs
 * a numbered row from hand-rolling the plate again.
 */
export function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  japanese,
  accentInk,
  multiline,
  leading,
  maxLength,
  editable = true,
  autoFocus,
  secure,
  autoCapitalize = 'none',
  autoComplete,
  keyboardType,
  returnKeyType,
  onSubmitEditing,
  style,
}: Props) {
  const p = usePalette();
  const s = useStyles(p);
  const [hidden, setHidden] = useState(Boolean(secure));

  return (
    <View style={[s.wrap, style]}>
      {label !== undefined && <Text style={s.label}>{label}</Text>}
      <InnerPlate style={[s.field, multiline && s.fieldMultiline]}>
        {leading}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={p.faint}
          secureTextEntry={hidden}
          autoCapitalize={autoCapitalize}
          autoComplete={autoComplete}
          keyboardType={keyboardType}
          autoCorrect={false}
          autoFocus={autoFocus}
          editable={editable}
          maxLength={maxLength}
          multiline={multiline}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          style={[
            s.input,
            japanese && s.inputJp,
            multiline && s.inputMultiline,
            accentInk && { color: p.accent },
          ]}
        />
        {secure && (
          <Touchable onPress={() => setHidden((h) => !h)} minTarget={false} hitSlop={8}>
            <Text style={s.toggle}>{hidden ? 'Show' : 'Hide'}</Text>
          </Touchable>
        )}
      </InnerPlate>
    </View>
  );
}

function useStyles(p: Palette) {
  return useMemo(
    () =>
      StyleSheet.create({
        wrap: { gap: 6 },
        label: { ...type.eyebrow, color: p.faint, textTransform: 'uppercase' },
        field: {
          minHeight: FIELD_H,
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm + 2,
          paddingHorizontal: spacing.md + 2,
        },
        // A wrapping field's ink starts at the top of the plate rather than
        // centring in it, or a two-line sentence pushes its first line up.
        fieldMultiline: { alignItems: 'flex-start', paddingVertical: spacing.sm },

        input: {
          ...type.bodyMd,
          color: p.ink,
          flex: 1,
          // RN gives an input its own vertical padding on Android; the plate
          // already supplies the height, so the input contributes none.
          padding: 0,
        },
        inputJp: { fontFamily: type.titleReading.fontFamily },
        inputMultiline: { lineHeight: 24, textAlignVertical: 'top' },

        toggle: { ...type.bodySm, fontFamily: type.headerTitle.fontFamily, color: p.muted },
      }),
    [p],
  );
}

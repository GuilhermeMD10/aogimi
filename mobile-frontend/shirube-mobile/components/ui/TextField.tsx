import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useColors } from '@/theme/ThemeContext';
import { fontSize, radius, spacing } from '@/theme/tokens';

type Props = {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  secure?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  autoComplete?: 'username' | 'password' | 'new-password' | 'off';
  returnKeyType?: 'done' | 'next' | 'go' | 'search';
  onSubmitEditing?: () => void;
};

export function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  secure,
  autoCapitalize = 'none',
  autoComplete,
  returnKeyType,
  onSubmitEditing,
}: Props) {
  const c = useColors();
  const [hidden, setHidden] = useState(Boolean(secure));

  return (
    <View>
      <Text style={[styles.label, { color: c.fgMuted }]}>{label}</Text>
      <View
        style={[
          styles.field,
          { backgroundColor: c.bgElev, borderColor: c.border },
        ]}
      >
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={c.fgSubtle}
          secureTextEntry={hidden}
          autoCapitalize={autoCapitalize}
          autoComplete={autoComplete}
          autoCorrect={false}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          style={[styles.input, { color: c.fg }]}
        />
        {secure && (
          <Pressable onPress={() => setHidden((h) => !h)} hitSlop={8}>
            <Text style={[styles.toggle, { color: c.fgMuted }]}>
              {hidden ? 'Show' : 'Hide'}
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: fontSize.xs,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    paddingHorizontal: spacing.xs,
    paddingBottom: 6,
  },
  field: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 18,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: fontSize.lg,
    padding: 0,
  },
  toggle: {
    fontSize: fontSize.sm,
    fontWeight: '500',
  },
});

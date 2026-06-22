import { Pressable, StyleSheet, Text } from 'react-native';
import { useColors } from '@/theme/ThemeContext';
import { useT } from '@/lib/i18n/I18nContext';
import { fontSize, spacing } from '@/theme/tokens';

type Props = {
  onPress: () => void;
  disabled?: boolean;
};

// Subtle text link below the result row. Only one step back is
// supported — `disabled` reflects the empty undo buffer. Local-only:
// the backend keeps the original event row, which is harmless because
// the next review on the same card overwrites the backend card state.
export function UndoButton({ onPress, disabled }: Props) {
  const c = useColors();
  const t = useT();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={10}
      style={({ pressed }) => [
        styles.btn,
        { opacity: disabled ? 0.3 : pressed ? 0.55 : 0.75 },
      ]}
    >
      <Text style={[styles.label, { color: c.fgMuted }]}>
        {`↶  ${t('study.undo')}`}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    alignSelf: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: '500',
  },
});

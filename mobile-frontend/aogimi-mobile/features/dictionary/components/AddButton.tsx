import { useMemo } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { usePalette } from '@/theme/ThemeContext';
import { radius, type Palette } from '@/theme/tokens';

/**
 * The square vermillion "add to deck" affordance that sits at the end of a
 * result row.
 *
 * A bare `plus` inside the bordered square: Feather has no
 * stacked-card-with-a-plus glyph, and the nearest ones (`copy`, `layers`) read
 * as duplicate/stack rather than add. The plus says the same thing at 14px
 * without the ambiguity.
 *
 * **Not on every row.** Names have no card builder — `cardDraft.ts` produces
 * word and kanji drafts only — and a recent-lookup row holds a snapshot without
 * the meanings a draft needs. Both are documented where they are omitted.
 */
export function AddButton({
  onPress,
  accessibilityLabel,
  size = 32,
}: {
  onPress: () => void;
  accessibilityLabel: string;
  /** 32 on a result card, 30 on the tighter recent row. */
  size?: number;
}) {
  const p = usePalette();
  const styles = useStyles(p);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={8}
      style={[styles.button, { width: size, height: size }]}
    >
      <Feather name="plus" size={size === 32 ? 15 : 14} color={p.accent} />
    </Pressable>
  );
}

function useStyles(p: Palette) {
  return useMemo(
    () =>
      StyleSheet.create({
        button: {
          borderRadius: radius.md - 3,
          borderWidth: 1,
          borderColor: p.paperBd,
          backgroundColor: p.paper,
          alignItems: 'center',
          justifyContent: 'center',
        },
      }),
    [p],
  );
}

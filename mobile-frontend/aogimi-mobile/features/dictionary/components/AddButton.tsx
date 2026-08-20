import { StyleSheet } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { Touchable } from '@/shared/components/Touchable';
import { usePalette } from '@/theme/ThemeContext';
import { MIN_TARGET } from '@/theme/motion';
import { radius } from '@/theme/tokens';

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
 *
 * Takes the glass wash, like every other button in the app. Its whole visual
 * box is tappable and `hitSlop` only extends past it to the 44pt floor — the
 * one direction slop is legitimate, since a control can be larger to the finger
 * than to the eye but never smaller.
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
  return (
    <Touchable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      surface="glass"
      radius={radius.md - 3}
      minTarget={false}
      hitSlop={(MIN_TARGET - size) / 2}
      style={[styles.button, { width: size, height: size }]}
    >
      <Feather name="plus" size={size === 32 ? 15 : 14} color={p.accent} />
    </Touchable>
  );
}

// Fill, border and sheens come from `surface="glass"`, so nothing here reads
// the palette and it can be a module-scope sheet.
const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

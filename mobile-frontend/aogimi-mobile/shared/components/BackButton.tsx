import { StyleSheet } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { Touchable } from './Touchable';
import { usePalette } from '@/theme/ThemeContext';

/**
 * The way out of a pushed screen: a bare chevron with a real target under it.
 *
 * **Icon only, and the box is the target.** Every back affordance in the app
 * used to be a chevron-plus-label row — a thin line of text whose hit area was
 * the height of the glyph. The label carried no information the chevron does
 * not (the chevron *is* the universal back symbol), and it made the control
 * read as a line of copy rather than a button. What it needed was area, not
 * words, so this is a 44pt square: `Touchable`'s `MIN_TARGET` floor with the
 * chevron centred in it.
 *
 * `label` is not drawn — it is the accessibility name, which is the one place
 * the word "Back" still has to exist.
 *
 * Aligned by its glyph, not its box: `marginLeft` cancels the padding the
 * square adds on the leading side, so the chevron's stroke sits on the gutter
 * the page's text starts from and the square grows inward from there.
 */
export function BackButton({
  label,
  onPress,
  size = 26,
}: {
  /** Accessibility name. Not rendered. */
  label: string;
  onPress: () => void;
  /** Chevron size. The 44pt target does not change with it. */
  size?: number;
}) {
  const p = usePalette();
  return (
    <Touchable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={styles.button}
    >
      <Feather name="chevron-left" size={size} color={p.ink} />
    </Touchable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
    marginLeft: -10,
  },
});

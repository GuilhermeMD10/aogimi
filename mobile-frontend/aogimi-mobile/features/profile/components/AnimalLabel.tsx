import { StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/theme/ThemeContext';
import { useT } from '@/lib/i18n/I18nContext';
import { fontFamily, radius } from '@/theme/tokens';
import { getAnimalTier } from '../lib/animalLabel';

type Props = {
  mastered: number;
};

// Text-only progression chip. Renders the animal name resolved from
// the mastered card count. No badge image, no progress hint toward
// the next tier — the user opted out of "X cards to next" pressure.
export function AnimalLabel({ mastered }: Props) {
  const c = useColors();
  const t = useT();
  const tier = getAnimalTier(mastered);

  return (
    <View
      style={[styles.chip, { backgroundColor: c.accentSoft, borderColor: 'transparent' }]}
    >
      <Text
        style={[styles.text, { color: c.accent, fontFamily: fontFamily.ui }]}
      >
        {t(`stats.animal.${tier}`)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  text: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.3,
    textTransform: 'capitalize',
  },
});

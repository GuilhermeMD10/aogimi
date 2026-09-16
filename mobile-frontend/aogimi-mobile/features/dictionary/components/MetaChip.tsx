import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { usePalette } from '@/theme/ThemeContext';
import { radius, type, type Palette } from '@/theme/tokens';

/**
 * The colourless metadata tag — POS, kanji school grade, a name's type.
 *
 * DESIGN.md's 6px tag shape, as the dictionary compositions draw the POS chip:
 * a Tier 2 fill with no border, 10px tracked uppercase in `faint`.
 *
 * **Not** the JLPT chip: that one is `shared/components/JlptChip`, whose
 * per-level hues are the tier's meaning rather than decoration. The two sit
 * side by side, so this one is deliberately without a hue — which is also why
 * it is not `shared`'s `Tag`, whose whole design is one colour at three
 * strengths.
 */
export function MetaChip({ label }: { label: string }) {
  const p = usePalette();
  const styles = useStyles(p);
  return (
    <View style={styles.chip}>
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

function useStyles(p: Palette) {
  return useMemo(
    () =>
      StyleSheet.create({
        chip: {
          borderRadius: radius.chip,
          // The composition's `rgba(255,255,255,0.06)` with no border — the
          // Tier 2 fill read directly, as `MeaningRow`'s index circle does.
          backgroundColor: p.glassStandard,
          paddingHorizontal: 6,
          paddingVertical: 2,
          maxWidth: 150,
        },
        /** 10px/600 tracked 0.06em → the eyebrow role's cut, looser tracking. */
        label: {
          ...type.eyebrow,
          letterSpacing: 0.6,
          textTransform: 'uppercase',
          color: p.faint,
        },
      }),
    [p],
  );
}

import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { usePalette } from '@/theme/ThemeContext';
import { fontFamily, radius, type Palette } from '@/theme/tokens';

/**
 * The outline metadata pill — POS, kanji school grade, a name's type.
 *
 * **Not** the JLPT chip: that one is `shared/components/JlptChip`, whose
 * per-level hues are the tier's meaning rather than decoration and are a
 * standing exception to the palette. The two sit side by side, so this one is
 * deliberately colourless.
 *
 * `fontFamily.mono` is the micro-label role (Switzer Medium, not monospaced —
 * see `theme/tokens.ts`). Latin only: anything Japanese passes `jp`.
 */
export function MetaChip({
  label,
  jp = false,
  strong = false,
}: {
  label: string;
  /** The label is Japanese — switches the face and drops the uppercasing,
   *  which does nothing to kana and breaks nothing but is noise to apply. */
  jp?: boolean;
  /** Filled variant, for a chip that carries a glyph beside its label. */
  strong?: boolean;
}) {
  const p = usePalette();
  const styles = useStyles(p);
  return (
    <View style={[styles.chip, strong && styles.strong]}>
      <Text style={[styles.label, jp ? styles.jpLabel : styles.latinLabel]} numberOfLines={1}>
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
          borderRadius: radius.pill,
          borderWidth: 1,
          borderColor: p.paperBd,
          paddingHorizontal: 8,
          paddingVertical: 2,
          maxWidth: 150,
        },
        strong: { backgroundColor: p.paperTile },
        label: {
          fontSize: 8.5,
          fontWeight: '500',
          color: p.muted,
        },
        latinLabel: {
          fontFamily: fontFamily.mono,
          letterSpacing: 0.5,
          textTransform: 'uppercase',
        },
        jpLabel: {
          fontFamily: fontFamily.jp,
          fontSize: 10,
        },
      }),
    [p],
  );
}

import { useMemo } from 'react';
import { StyleSheet, Text } from 'react-native';
import { usePalette, type, type Palette } from '@/theme';

/**
 * The eyebrow that opens each block — RECENTLY LOOKED UP, MEANINGS, KANJI IN
 * THIS WORD.
 *
 * DESIGN.md's section eyebrow (10px, 0.16em, `faint`). Not `shared/components/
 * RowGroup`'s `SectionLabel`, which carries the settings list's fixed margins;
 * this one lets the caller own spacing.
 */
export function SectionHeading({ label }: { label: string }) {
  const p = usePalette();
  const styles = useStyles(p);
  return <Text style={styles.label}>{label}</Text>;
}

function useStyles(p: Palette) {
  return useMemo(
    () =>
      StyleSheet.create({
        label: { ...type.eyebrow, textTransform: 'uppercase', color: p.faint },
      }),
    [p],
  );
}

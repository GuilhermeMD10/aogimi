import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { usePalette, spacing, type, type Palette } from '@/theme';

/**
 * The eyebrow-and-title block at the top of a reader sheet: `読 · CONTENTS`
 * over `目次`.
 *
 * ── The domain mark is not part of the translated string ───────────────────
 * The handoff prefixes each sheet's eyebrow with the app's mark for that domain
 * — 読 for the reader, 空 for the sky — and those two glyphs are brand, not
 * copy: they are the same in every locale. So the component owns the mark and
 * the separator, and `eyebrow` carries only the word that translates. A single
 * `"読 · Contents"` string in the bundles would have had a translator either
 * keeping a kanji they cannot read or dropping the brand.
 */
export function SheetHeading({
  mark,
  eyebrow,
  title,
}: {
  /** The domain mark — `読` for the reader, `空` for the sky. */
  mark: string;
  /** Uppercased by the style; pass it in the locale's natural case. */
  eyebrow: string;
  /** The sheet's own title. Japanese by design in every locale. */
  title: string;
}) {
  const p = usePalette();
  const s = useStyles(p);
  return (
    <View style={s.block}>
      <Text style={s.eyebrow}>{`${mark} · ${eyebrow}`}</Text>
      <Text style={s.title}>{title}</Text>
    </View>
  );
}

function useStyles(p: Palette) {
  return useMemo(
    () =>
      StyleSheet.create({
        block: { gap: spacing.xs },
        eyebrow: { ...type.eyebrow, color: p.faint, textTransform: 'uppercase' },
        title: { ...type.headlineMd, color: p.ink },
      }),
    [p],
  );
}

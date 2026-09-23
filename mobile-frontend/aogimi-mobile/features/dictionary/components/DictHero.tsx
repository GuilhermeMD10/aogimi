import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { usePalette, spacing, type, type Palette } from '@/theme';

/**
 * The empty state's centred title block — `DictionarySearch.dc.html`'s hero:
 * a tracked Japanese kicker in accent, the headline, and one line of caption.
 *
 * Text only — the search field belongs to the view, which owns the query and
 * pins it above every frame; the hero is what fills the page under it while
 * nothing is typed.
 */
export function DictHero({
  kicker,
  title,
  caption,
}: {
  /** Japanese — 引いてみる. Takes the JP face and the accent ink. */
  kicker: string;
  title: string;
  caption: string;
}) {
  const p = usePalette();
  const styles = useStyles(p);
  return (
    <View style={styles.wrap}>
      <Text style={styles.kicker}>{kicker}</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.caption}>{caption}</Text>
    </View>
  );
}

function useStyles(p: Palette) {
  return useMemo(
    () =>
      StyleSheet.create({
        wrap: { alignItems: 'center', paddingTop: spacing.xs + 2 },
        /** The composition's 11px/700 kicker tracked 0.1em, in the JP bold cut
         *  `titleKanji` names — an eyebrow in the Japanese face. */
        kicker: {
          fontFamily: type.titleKanji.fontFamily,
          fontSize: 11,
          fontWeight: '700',
          lineHeight: 14,
          letterSpacing: 1.1,
          textTransform: 'uppercase',
          color: p.accent,
          marginBottom: spacing.sm + 2,
        },
        /** 30/800 in the composition; 800 resolves to our heaviest cut. The
         *  `screenTitle` role is 26 (Library's) — see its note in `tokens.ts` —
         *  so only the family is borrowed here. */
        title: {
          fontFamily: type.screenTitle.fontFamily,
          fontSize: 30,
          fontWeight: '700',
          lineHeight: 36,
          letterSpacing: -0.3,
          color: p.ink,
          textAlign: 'center',
        },
        /** The composition sets this in italic; Switzer ships no italic cut
         *  (see `theme/switzer.ts`), so it is the roman at the same size. */
        caption: {
          ...type.bodySm,
          color: p.muted,
          marginTop: spacing.xs + 2,
          textAlign: 'center',
        },
      }),
    [p],
  );
}

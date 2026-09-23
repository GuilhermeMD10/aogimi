import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { InnerPlate } from './Card';
import { usePalette, spacing, type, type Palette } from '@/theme';

/** The numbered circle: DESIGN.md says 20px; the inspector composition draws 18. 20 wins. */
const INDEX = 20;

/**
 * **One gloss, numbered** — DESIGN.md's meaning row: a 20px circle with the
 * index and 14px text, on a Tier 1 plate. The inspector, the study card's back
 * and the add-card sheet all list a card's meanings this way, which is why the
 * plate is not hand-rolled in each.
 */
export function MeaningRow({
  index,
  text,
  meta,
}: {
  index: number;
  text: string;
  /** A mono line under the gloss — the dictionary entry's per-sense part of
   *  speech when it differs from the headword's. */
  meta?: string;
}) {
  const p = usePalette();
  const s = useStyles(p);
  return (
    <InnerPlate style={s.row}>
      <View style={s.index}>
        <Text style={s.indexLabel}>{index}</Text>
      </View>
      <View style={s.body}>
        <Text style={s.text}>{text}</Text>
        {meta !== undefined && <Text style={s.meta}>{meta}</Text>}
      </View>
    </InnerPlate>
  );
}

function useStyles(p: Palette) {
  return useMemo(
    () =>
      StyleSheet.create({
        row: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm + 2,
          paddingVertical: spacing.sm,
          paddingHorizontal: spacing.md,
        },
        index: {
          width: INDEX,
          height: INDEX,
          borderRadius: INDEX / 2,
          backgroundColor: p.glassStandard,
          alignItems: 'center',
          justifyContent: 'center',
        },
        indexLabel: {
          ...type.eyebrow,
          fontFamily: type.headlineMd.fontFamily,
          fontWeight: '700',
          letterSpacing: 0,
          color: p.muted,
        },
        body: { flex: 1, gap: 2 },
        text: { ...type.bodySm, fontSize: 14, lineHeight: 20, color: p.ink },
        meta: { ...type.monoMeta, textTransform: 'uppercase', color: p.faint },
      }),
    [p],
  );
}

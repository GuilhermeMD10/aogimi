import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Glass } from '@/shared/components/Glass';
import { PopoverMenu } from '@/shared/components/PopoverMenu';
import { usePalette } from '@/theme/ThemeContext';
import { useT } from '@/lib/i18n/I18nContext';
import { spacing, type, type Palette } from '@/theme/tokens';
import { deckGlyphFor } from '../lib/deckVisuals';

/** DESIGN.md's lifted node: 88pt accent glass, with an orbit ring at +8. */
const NODE = 88;
const RING = NODE + 16;

/**
 * The deck's menu — `SkyDeckMenu.dc.html`. Reached two ways that mean the same
 * thing: a finger held on a constellation at the outer tier, or the `…` in the
 * focused deck's header. Three rows: rename, stats, delete.
 *
 * The header above the pane is the pressed deck, lifted: its glyph in an
 * accent-glass circle with an orbit ring, its name, and `340 stars · 28 due` in
 * mono. The composition also badges the stats row with a percentage nobody
 * labels; the owner asked for the menu to be simple, so the row is bare.
 *
 * `deck` is null while nothing is being asked about; the menu is then hidden
 * rather than unmounted, so the dismiss animation has something to run on.
 */
export function DeckMenu({
  deck,
  dueCount,
  onDismiss,
  onEdit,
  onStats,
  onDelete,
}: {
  deck: { id: string; name: string; cards: readonly unknown[] } | null;
  /** `null` while the count is in flight — the meta line shows a dash. */
  dueCount: number | null;
  onDismiss: () => void;
  onEdit: () => void;
  onStats: () => void;
  onDelete: () => void;
}) {
  const p = usePalette();
  const t = useT();
  const s = useStyles(p);

  return (
    <PopoverMenu
      visible={deck !== null}
      onDismiss={onDismiss}
      header={
        deck && (
          <View style={s.header}>
            <View style={s.nodeWrap}>
              <View style={s.ring} />
              <Glass material="accent" radius={NODE / 2} style={s.node}>
                <Text style={s.glyph} numberOfLines={1}>
                  {deckGlyphFor(deck.name)}
                </Text>
              </Glass>
            </View>
            <Text style={s.name} numberOfLines={1}>
              {deck.name}
            </Text>
            <Text style={s.meta}>
              {t('sky.starsDue', {
                stars: deck.cards.length.toLocaleString(),
                due: dueCount === null ? '—' : dueCount.toLocaleString(),
              })}
            </Text>
          </View>
        )
      }
      items={[
        { key: 'edit', label: t('sky.editDeck'), icon: 'edit-2', onPress: onEdit },
        { key: 'stats', label: t('sky.showStats'), icon: 'bar-chart-2', accent: true, onPress: onStats },
        { key: 'delete', label: t('sky.deleteDeck'), icon: 'trash-2', destructive: true, onPress: onDelete },
      ]}
    />
  );
}

function useStyles(p: Palette) {
  return useMemo(
    () =>
      StyleSheet.create({
        header: { alignItems: 'center', gap: spacing.sm + 2, maxWidth: '100%' },
        nodeWrap: { width: RING, height: RING, alignItems: 'center', justifyContent: 'center' },
        ring: {
          ...StyleSheet.absoluteFillObject,
          borderRadius: RING / 2,
          borderWidth: 1,
          borderColor: p.glassAccentBd,
        },
        node: {
          width: NODE,
          height: NODE,
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: p.glowNode,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 1,
          shadowRadius: 18,
        },
        glyph: { ...type.titleKanji, fontSize: 30, lineHeight: 38, color: p.ink },
        name: { ...type.headerTitle, color: p.ink, textAlign: 'center' },
        meta: { ...type.monoMeta, color: p.muted, fontVariant: ['tabular-nums'] },
      }),
    [p],
  );
}

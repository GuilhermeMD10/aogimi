import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Glass } from '@/shared/components/Glass';
import { IconButton } from '@/shared/components/IconButton';
import { CloudSyncIcon } from '@/shared/icons/sync-icons';
import { usePalette } from '@/theme/ThemeContext';
import { useT } from '@/lib/i18n/I18nContext';
import { radius, spacing, type, type Palette } from '@/theme/tokens';

/** The star chip's height — DESIGN.md's filter-chip control. */
const CHIP_H = 32;

/**
 * **The one green in the app.** "Synced" is a status, not a palette colour, and
 * this is the same hex the library's `SyncPill` and the Help screen use. The
 * owner asked for the icon to stay as it is; it is a standing exception to the
 * no-inline-hex rule, not a new token.
 */
const SYNC_GREEN = '#2E9F58';

/**
 * The outer tier's top bar: how many stars there are, the app's only manual
 * push, and the way to a new deck.
 *
 * `SkyMain.dc.html` draws `★ 1,420 stars` beside a `● SYNCED` pill. The owner's
 * notes replace the pill with the sync **button** the stage already had — same
 * green cloud, no text label — because the button does something and the pill
 * only said something. The three-dots on the right opens the stage's menu,
 * which today holds one row: a new deck.
 *
 * `stars` is `null` while the local store is still being read; the chip then
 * shows a dash rather than a confident zero.
 */
export function SkyTopBar({
  stars,
  syncing,
  onSync,
  onMore,
}: {
  stars: number | null;
  syncing: boolean;
  onSync: () => void;
  onMore: () => void;
}) {
  const p = usePalette();
  const t = useT();
  const s = useStyles(p);

  return (
    <View style={s.row} pointerEvents="box-none">
      <View style={s.left}>
        <Glass tier={2} radius={radius.control} style={s.chip}>
          <Text style={s.chipCount}>
            {'★ '}
            {stars === null ? '—' : stars.toLocaleString()}
          </Text>
          <Text style={s.chipLabel}>{t('sky.starsChip')}</Text>
        </Glass>
        <IconButton size={36} loading={syncing} onPress={onSync} accessibilityLabel={t('sky.sync')}>
          <CloudSyncIcon size={18} color={SYNC_GREEN} />
        </IconButton>
      </View>

      <IconButton glyph="more" size={36} onPress={onMore} accessibilityLabel={t('sky.more')} />
    </View>
  );
}

function useStyles(p: Palette) {
  return useMemo(
    () =>
      StyleSheet.create({
        row: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: spacing.sm,
        },
        left: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
        chip: {
          height: CHIP_H,
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.xs,
          paddingHorizontal: spacing.md,
        },
        chipCount: {
          ...type.caption,
          fontFamily: type.headerTitle.fontFamily,
          color: p.accent,
          fontVariant: ['tabular-nums'],
        },
        chipLabel: { ...type.caption, color: p.faint },
      }),
    [p],
  );
}

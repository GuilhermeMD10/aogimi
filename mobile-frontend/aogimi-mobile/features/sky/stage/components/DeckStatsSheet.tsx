import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';

import { BottomSheet } from '@/shared/components/BottomSheet';
import { InnerPlate } from '@/shared/components/Card';
import { Glass } from '@/shared/components/Glass';
import { IconButton } from '@/shared/components/IconButton';
import { StatTile } from '@/shared/components/StatTile';
import { usePalette } from '@/theme/ThemeContext';
import { useT } from '@/lib/i18n/I18nContext';
import { spacing, type, type Palette } from '@/theme/tokens';
import { useStatsActivity } from '@/features/profile/hooks/useStatsActivity';
import type { DeckWithCards } from '../hooks/useSkyDecks';
import { avgIntervalDaysOf, lastSevenDays, recentRetentionOf } from '../lib/deckStats';
import { masteryMixOf, MIX_ORDER } from '../lib/masteryMix';
import { MixBar } from './MixBar';

/** `SkyStats.dc.html`: a Tier 4 sheet at 60% of the screen; the 40pt icon plate in its header. */
const HEIGHT_RATIO = 0.72;
const PLATE = 40;
const BARS_H = 64;

/**
 * A deck's figures — `SkyStats.dc.html`, reached from the deck menu's
 * `Show stats` row.
 *
 * Four things, top to bottom, and what each is made of:
 *
 *   · **Retention** — the share of the deck's most recent grades that were not
 *     `Again`, from `last_outcomes` (see `deckStats.ts`). Recent, not all-time;
 *     the meta line says so.
 *   · **Avg interval** — the mean scheduled interval over reviewed cards,
 *     shown in hours under a day and in days above.
 *   · **Mastery distribution** — the same `masteryMixOf` the stage's ledger
 *     used, on `RANK_COLORS`.
 *   · **7-day activity** — `/api/stats/activity`, which is **account-wide**:
 *     there is no per-deck activity endpoint (the query would need a `deckId`
 *     filter server-side). The card is labelled *all decks* rather than
 *     pretending, and softens to a caption when the request cannot be made.
 *
 * The body is its own component so its hooks mount when the sheet opens and
 * unmount with it — a `Modal` with `visible={false}` renders no children, so
 * the activity request fires per open rather than once per app launch.
 */
export function DeckStatsSheet({ deck, onDismiss }: { deck: DeckWithCards | null; onDismiss: () => void }) {
  return (
    <BottomSheet visible={deck !== null} onDismiss={onDismiss} heightRatio={HEIGHT_RATIO}>
      {deck && <StatsBody deck={deck} onDismiss={onDismiss} />}
    </BottomSheet>
  );
}

function StatsBody({ deck, onDismiss }: { deck: DeckWithCards; onDismiss: () => void }) {
  const p = usePalette();
  const t = useT();
  const s = useStyles(p);
  const { data: activity, loading: activityLoading, error: activityError } = useStatsActivity();

  const retention = useMemo(() => recentRetentionOf(deck.cards), [deck.cards]);
  const avgInterval = useMemo(() => avgIntervalDaysOf(deck.cards), [deck.cards]);
  const mix = useMemo(() => masteryMixOf(deck.cards), [deck.cards]);
  const total = MIX_ORDER.reduce((n, st) => n + mix[st], 0);
  const week = useMemo(() => lastSevenDays(activity.perDay), [activity.perDay]);
  const weekMax = Math.max(1, ...week.map((d) => d.count));

  const interval =
    avgInterval === null
      ? { value: '—', unit: undefined }
      : avgInterval < 1
        ? { value: String(Math.round(avgInterval * 24)), unit: t('sky.stats.hours') }
        : { value: avgInterval >= 100 ? String(Math.round(avgInterval)) : avgInterval.toFixed(1), unit: t('sky.stats.days') };

  return (
    <View style={s.host}>
      <View style={s.header}>
        <View style={s.headerLeft}>
          <Glass material="accent" radius={PLATE / 2} shadow={false} style={s.plate}>
            <Feather name="bar-chart-2" size={16} color={p.accent} />
          </Glass>
          <View style={s.headerText}>
            <Text style={s.title}>{t('sky.stats.title')}</Text>
            <Text style={s.subtitle} numberOfLines={1}>
              {deck.name}
            </Text>
          </View>
        </View>
        <IconButton icon="x" size={36} onPress={onDismiss} accessibilityLabel={t('sky.stats.close')} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <View style={s.tiles}>
          <StatTile
            eyebrow={t('sky.stats.retention')}
            value={retention === null ? '—' : `${Math.round(retention * 100)}%`}
            meta={t('sky.stats.retentionMeta')}
            tone={p.accentLeaf}
            style={s.tile}
          />
          <StatTile
            eyebrow={t('sky.stats.avgInterval')}
            value={interval.value}
            unit={interval.unit}
            tone={p.accentSky}
            style={s.tile}
          />
        </View>

        <InnerPlate style={s.card}>
          <View style={s.cardHead}>
            <Text style={s.cardTitle}>{t('sky.stats.distribution')}</Text>
            <Text style={s.cardMeta}>{t('sky.stats.total', { count: total.toLocaleString() })}</Text>
          </View>
          <MixBar mix={mix} />
        </InnerPlate>

        <InnerPlate style={s.card}>
          <View style={s.cardHead}>
            <Text style={s.cardTitle}>{t('sky.stats.activity')}</Text>
            <Text style={s.cardEyebrow}>{t('sky.stats.activityMeta')}</Text>
          </View>
          {activityError ? (
            <Text style={s.soft}>{t('sky.stats.activityUnavailable')}</Text>
          ) : (
            <View style={[s.bars, activityLoading && s.dim]}>
              {week.map((d, i) => {
                const today = i === week.length - 1;
                // Never a bare baseline: an empty day keeps a 4pt stub so the
                // week reads as seven days rather than as gaps.
                const h = Math.max(4, Math.round((d.count / weekMax) * (BARS_H - 16)));
                return (
                  <View key={d.date} style={s.day}>
                    <View style={[s.bar, { height: h }, today && s.barToday]} />
                    <Text style={[s.dayLabel, today && s.dayLabelToday]}>
                      {new Date(`${d.date}T12:00:00Z`).toLocaleDateString(undefined, { weekday: 'narrow' })}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </InnerPlate>
      </ScrollView>
    </View>
  );
}

function useStyles(p: Palette) {
  return useMemo(
    () =>
      StyleSheet.create({
        host: { flex: 1, paddingHorizontal: spacing.screenX, gap: spacing.md },
        header: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: spacing.md,
          paddingBottom: spacing.md,
          borderBottomWidth: 1,
          borderBottomColor: p.bdB,
        },
        headerLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 2, flex: 1, minWidth: 0 },
        headerText: { flex: 1, minWidth: 0, gap: 2 },
        plate: { width: PLATE, height: PLATE, alignItems: 'center', justifyContent: 'center' },
        title: { ...type.headerTitle, color: p.ink },
        subtitle: { ...type.bodySm, fontFamily: type.titleReading.fontFamily, color: p.muted },

        scroll: { gap: spacing.md, paddingBottom: spacing.xl },
        tiles: { flexDirection: 'row', gap: spacing.sm + 2 },
        tile: { flex: 1 },

        card: { padding: spacing.md + 2, gap: spacing.sm + 2 },
        cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
        cardTitle: { ...type.bodySm, color: p.ink },
        cardMeta: { ...type.monoMeta, color: p.accent, fontVariant: ['tabular-nums'] },
        cardEyebrow: { ...type.eyebrow, color: p.faint, textTransform: 'uppercase' },

        bars: {
          height: BARS_H,
          flexDirection: 'row',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          gap: 6,
        },
        dim: { opacity: 0.5 },
        day: { flex: 1, height: '100%', alignItems: 'center', justifyContent: 'flex-end', gap: 4 },
        bar: {
          width: '100%',
          backgroundColor: p.tintA,
          borderTopLeftRadius: 2,
          borderTopRightRadius: 2,
        },
        barToday: {
          backgroundColor: p.fill,
          shadowColor: p.glowProgress,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 1,
          shadowRadius: 6,
        },
        dayLabel: { ...type.eyebrow, letterSpacing: 0, color: p.faint },
        dayLabelToday: { color: p.accent, fontFamily: type.headlineMd.fontFamily, fontWeight: '700' },
        soft: { ...type.bodySm, color: p.faint, paddingVertical: spacing.md },
      }),
    [p],
  );
}

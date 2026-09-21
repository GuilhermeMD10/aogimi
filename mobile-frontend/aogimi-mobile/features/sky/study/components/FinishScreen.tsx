import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/shared/components/Button';
import { Card } from '@/shared/components/Card';
import { Header } from '@/shared/components/Header';
import { ProgressBar } from '@/shared/components/ProgressBar';
import { Screen } from '@/shared/components/Screen';
import { StatTile } from '@/shared/components/StatTile';
import { usePalette } from '@/theme/ThemeContext';
import { useT } from '@/lib/i18n/I18nContext';
import { spacing, type, type Palette } from '@/theme/tokens';
import { durationMinutes, hardestOf, sessionStatsOf, tierUpgradesOf } from '../lib/sessionStats';
import { HardestInSessionList } from './HardestInSessionList';
import { TierUpgradesList } from './TierUpgradesList';
import type { SessionSummary } from '../types';

/** As many hard cards as the composition draws. */
const HARDEST_SHOWN = 3;

type Props = {
  summary: SessionSummary;
  /** Empty in a cross-deck session, which drops it from the subtitle. */
  deckName: string;
  /** The session's size, for the reviewed-count percentage. */
  totalAtStart: number;
  startedAt: number;
  onStudyAgain: () => void;
  onBackToDeck: () => void;
};

/**
 * **Session complete** — `Study.dc.html`'s Finished screen: one card holding
 * the review total, the cards that fought back, and the ones that climbed a
 * rung.
 *
 * ── The two buttons are not in the composition ─────────────────────────────
 * It draws the summary card and then empty space to the home indicator, with
 * the back chevron as the only way out. `Study again` and `Back to deck` are
 * the screen's existing behaviour and the brief keeps behaviour over the
 * handoff where the two disagree, so they stay — restyled as a primary and a
 * secondary. Flagged in the report.
 *
 * ── Sections disappear rather than empty ───────────────────────────────────
 * A session with nothing hard in it and nothing promoted collapses to the
 * review total alone, dividers included. Reachable on any short clean run,
 * and reachable immediately: the header's back chevron ends a session on the
 * spot, including one the user opened and answered nothing in.
 */
export function FinishScreen({
  summary,
  deckName,
  totalAtStart,
  startedAt,
  onStudyAgain,
  onBackToDeck,
}: Props) {
  const p = usePalette();
  const t = useT();
  const s = useStyles(p);

  // Snapshotted at mount, not read per render: the sitting ended when this
  // screen appeared, and a live clock would have the summary's minutes creep
  // up while the user reads it.
  const [endedAt] = useState(() => Date.now());

  const stats = useMemo(() => sessionStatsOf(summary), [summary]);
  const upgrades = useMemo(() => tierUpgradesOf(summary.perCard), [summary]);
  const hardest = useMemo(() => hardestOf(summary.perCard, HARDEST_SHOWN), [summary]);

  const minutes = durationMinutes(startedAt, endedAt);
  const subtitle = [deckName.toUpperCase(), t('study.finish.minutes', { n: minutes })]
    .filter((part) => part.length > 0)
    .join(' · ');

  const pct = totalAtStart > 0 ? Math.round((stats.reviewed / totalAtStart) * 100) : 0;

  return (
    <Screen padded edges={['top', 'bottom']}>
      <View style={s.root}>
        <Header
          title={t('study.finish.title')}
          subtitle={subtitle}
          onBack={onBackToDeck}
          backLabel={t('study.backToDeck')}
        />

        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
          <Card style={s.summary}>
            <View style={s.section}>
              <View style={s.sectionHead}>
                <Text style={s.sectionTitle}>
                  {t('study.finish.reviewed', { n: stats.reviewed })}
                </Text>
                <Text style={s.sectionMeta}>{`${pct}%`}</Text>
              </View>
              <ProgressBar value={pct} />
              <View style={s.tiles}>
                <StatTile
                  eyebrow={t('study.finish.correct')}
                  value={String(stats.correct)}
                  meta={t('study.finish.correctMeta', { pct: stats.correctPct })}
                  tone={p.correct}
                  style={s.tile}
                />
                <StatTile
                  eyebrow={t('study.finish.missed')}
                  value={String(stats.missed)}
                  meta={t('study.finish.missedMeta', { n: stats.missedCards })}
                  tone={p.srsAgain}
                  style={s.tile}
                />
              </View>
            </View>

            {hardest.length > 0 && (
              <>
                <View style={s.hairline} />
                <View style={s.section}>
                  <View style={s.sectionHead}>
                    <Text style={s.sectionTitle}>{t('study.finish.hardest')}</Text>
                    <Text style={s.sectionEyebrow}>{t('study.finish.thisSession')}</Text>
                  </View>
                  <HardestInSessionList cards={hardest} />
                </View>
              </>
            )}

            {upgrades.length > 0 && (
              <>
                <View style={s.hairline} />
                <View style={s.section}>
                  <View style={s.sectionHead}>
                    <Text style={s.sectionTitle}>{t('study.finish.upgrades')}</Text>
                    <Text style={s.sectionMeta}>
                      {t('study.finish.upgradesMeta', { n: upgrades.length })}
                    </Text>
                  </View>
                  <TierUpgradesList upgrades={upgrades} />
                </View>
              </>
            )}
          </Card>
        </ScrollView>

        <View style={s.actions}>
          <Button label={t('study.studyAgain')} onPress={onStudyAgain} full />
          <Button
            label={t('study.backToDeck')}
            variant="secondary"
            onPress={onBackToDeck}
            full
          />
        </View>
      </View>
    </Screen>
  );
}

function useStyles(p: Palette) {
  return useMemo(
    () =>
      StyleSheet.create({
        root: {
          flex: 1,
          paddingTop: spacing.screenTop,
          paddingBottom: spacing.screenBottom,
          gap: spacing.stackGap,
        },
        scroll: { paddingBottom: spacing.lg },
        summary: { gap: spacing.lg },
        section: { gap: spacing.md },
        sectionHead: {
          flexDirection: 'row',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: spacing.sm,
        },
        sectionTitle: { ...type.headlineMd, color: p.ink, flexShrink: 1 },
        sectionMeta: { ...type.monoMeta, color: p.faint, fontVariant: ['tabular-nums'] },
        sectionEyebrow: { ...type.eyebrow, color: p.faint, textTransform: 'uppercase' },
        hairline: { height: 1, backgroundColor: p.bdB },
        tiles: { flexDirection: 'row', gap: spacing.sm + 2 },
        tile: { flex: 1 },
        actions: { gap: spacing.sm },
      }),
    [p],
  );
}

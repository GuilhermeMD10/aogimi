import { ActivityIndicator, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { Screen } from '@/shared/components/Screen';
import { BackBar } from '@/shared/components/BackBar';
import { useColors } from '@/theme/ThemeContext';
import { useT } from '@/lib/i18n/I18nContext';
import { fontFamily, fontSize, spacing } from '@/theme/tokens';
import { useStudyDisplayPrefs } from '../hooks/useStudyDisplayPrefs';
import { PresetPicker } from './PresetPicker';
import type { BackPrefs, FrontPrefs } from '../types';

// User-facing screen for study display preferences. Saves are
// optimistic (toggle flips immediately, then persists to AsyncStorage
// + pushes to the backend in the background). Picking a preset
// rewrites all toggles to the preset's baseline.

type FrontToggle = { key: keyof FrontPrefs; labelKey: string };
type BackToggle  = { key: keyof BackPrefs;  labelKey: string };

const FRONT_TOGGLES: FrontToggle[] = [
  { key: 'reading',  labelKey: 'studyDisplay.front.reading' },
  { key: 'context',  labelKey: 'studyDisplay.front.context' },
  { key: 'deckName', labelKey: 'studyDisplay.front.deckName' },
];

const BACK_TOGGLES: BackToggle[] = [
  { key: 'exampleSentence', labelKey: 'studyDisplay.back.exampleSentence' },
];

export function StudyDisplaySettings() {
  const c = useColors();
  const t = useT();
  const { prefs, loading, setPreset, toggleFront, toggleBack } = useStudyDisplayPrefs();

  // The back bar renders in the loading branch too. It is the only way off this
  // screen — there is no dock on a pushed page — so a slow `useStudyDisplayPrefs`
  // would otherwise strand the user on a spinner with no exit.
  if (loading) {
    return (
      <Screen padded>
        <BackBar title={t('studyDisplay.title')} />
        <View style={styles.centered}>
          <ActivityIndicator color={c.fg} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen padded>
      <BackBar title={t('studyDisplay.title')} />

      <ScrollView contentContainerStyle={styles.scroll}>
        <Section label={t('studyDisplay.sectionPreset')} c={c}>
          <PresetPicker value={prefs.preset} onChange={setPreset} />
        </Section>

        <Section label={t('studyDisplay.sectionFront')} c={c}>
          {FRONT_TOGGLES.map(({ key, labelKey }) => (
            <ToggleRow
              key={key}
              label={t(labelKey)}
              value={prefs.front[key]}
              onToggle={() => toggleFront(key)}
              c={c}
            />
          ))}
        </Section>

        <Section label={t('studyDisplay.sectionBack')} c={c}>
          {BACK_TOGGLES.map(({ key, labelKey }) => (
            <ToggleRow
              key={key}
              label={t(labelKey)}
              value={prefs.back[key]}
              onToggle={() => toggleBack(key)}
              c={c}
            />
          ))}
        </Section>
      </ScrollView>
    </Screen>
  );
}

function Section({
  label,
  c,
  children,
}: {
  label: string;
  c: ReturnType<typeof useColors>;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionLabel, { color: c.fgMuted }]}>{label}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function ToggleRow({
  label,
  value,
  onToggle,
  c,
}: {
  label: string;
  value: boolean;
  onToggle: () => void;
  c: ReturnType<typeof useColors>;
}) {
  return (
    <View style={[styles.row, { borderColor: c.border }]}>
      <Text style={[styles.rowLabel, { color: c.fg }]}>{label}</Text>
      <Switch value={value} onValueChange={onToggle} />
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingBottom: spacing.xxl, gap: spacing.lg },
  section: { gap: 8 },
  sectionLabel: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    paddingHorizontal: 2,
  },
  sectionBody: { gap: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowLabel: { fontSize: fontSize.md, flex: 1 },
});

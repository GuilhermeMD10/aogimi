import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useColors } from '@/theme/ThemeContext';
import { useT } from '@/lib/i18n/I18nContext';
import { fontFamily, fontSize, radius, spacing } from '@/theme/tokens';
import { ActivityTab } from './ActivityTab';
import { CardsTab } from './CardsTab';

type Tab = 'activity' | 'cards';

export function StatsScreen() {
  const c = useColors();
  const t = useT();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('activity');

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: c.bg }]} edges={['top']}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Text style={[styles.back, { color: c.fg }]}>‹</Text>
        </Pressable>
        <Text style={[styles.title, { color: c.fg, fontFamily: fontFamily.ui }]}>
          {t('stats.title')}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={[styles.tabs, { backgroundColor: c.bgSunken, borderColor: c.border }]}>
        <TabCell
          label={t('stats.tabActivity')}
          selected={tab === 'activity'}
          onPress={() => setTab('activity')}
          c={c}
        />
        <TabCell
          label={t('stats.tabCards')}
          selected={tab === 'cards'}
          onPress={() => setTab('cards')}
          c={c}
        />
      </View>

      <View style={styles.tabBody}>
        {tab === 'activity' ? <ActivityTab /> : <CardsTab />}
      </View>
    </SafeAreaView>
  );
}

function TabCell({
  label,
  selected,
  onPress,
  c,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  c: ReturnType<typeof useColors>;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.tabCell,
        selected
          ? { backgroundColor: c.bgElev, borderColor: c.borderStrong }
          : { borderColor: 'transparent' },
      ]}
      hitSlop={4}
    >
      <Text
        style={[
          styles.tabLabel,
          { color: selected ? c.fg : c.fgMuted, fontWeight: selected ? '600' : '500' },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  back: { fontSize: 30, lineHeight: 30, fontWeight: '300' },
  title: { fontSize: fontSize.lg, fontWeight: '600' },
  tabs: {
    flexDirection: 'row',
    marginHorizontal: spacing.lg,
    marginTop: spacing.xs,
    padding: 4,
    gap: 2,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  tabCell: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  tabLabel: { fontSize: fontSize.sm, letterSpacing: -0.1 },
  tabBody: { flex: 1 },
});

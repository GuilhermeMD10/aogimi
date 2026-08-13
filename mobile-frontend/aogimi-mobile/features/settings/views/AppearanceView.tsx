import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import { Screen } from '@/shared/components/Screen';
import { useColors, useTheme, type ThemePreference } from '@/theme/ThemeContext';
import { fontFamily, fontSize, spacing } from '@/theme/tokens';
import { useT } from '@/lib/i18n/I18nContext';

// Theme picker — Day / Night / System. Deliberately the same shape as
// `LanguageView`: a pushed page of flat rows with a checkmark on the active
// one, writing through a provider that persists on its own. Two settings that
// do the same kind of thing should not look like two different features.
//
// Unlike the language picker this does **not** `router.back()` on select: the
// whole point of the choice is visible on the page you are standing on, so
// staying put lets you compare the two without navigating twice.

const OPTIONS: { value: ThemePreference; labelKey: string; subKey: string }[] = [
  { value: 'system', labelKey: 'appearance.system', subKey: 'appearance.systemSub' },
  { value: 'day', labelKey: 'appearance.day', subKey: 'appearance.daySub' },
  { value: 'night', labelKey: 'appearance.night', subKey: 'appearance.nightSub' },
];

export function AppearanceView() {
  const c = useColors();
  const t = useT();
  const router = useRouter();
  const { preference, setPreference } = useTheme();

  return (
    <Screen padded>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={styles.backRow}>
          <Feather name="chevron-left" size={22} color={c.fg} />
          <Text style={[styles.backLabel, { color: c.fg }]}>{t('common.back')}</Text>
        </Pressable>
        <Text style={[styles.title, { color: c.fg, fontFamily: fontFamily.ui }]}>
          {t('appearance.title')}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {OPTIONS.map((opt, i) => {
          const active = opt.value === preference;
          return (
            <Pressable
              key={opt.value}
              onPress={() => setPreference(opt.value)}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
              style={[
                styles.row,
                {
                  borderTopWidth: i === 0 ? StyleSheet.hairlineWidth : 0,
                  borderBottomWidth: StyleSheet.hairlineWidth,
                  borderColor: c.border,
                },
              ]}
            >
              <View style={styles.rowText}>
                <Text style={[styles.rowLabel, { color: c.fg }]}>{t(opt.labelKey)}</Text>
                <Text style={[styles.rowSub, { color: c.fgMuted }]}>{t(opt.subKey)}</Text>
              </View>
              {active && <Feather name="check" size={18} color={c.fg} />}
            </Pressable>
          );
        })}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { marginBottom: spacing.md },
  backRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm, gap: 2 },
  backLabel: { fontSize: fontSize.md },
  title: {
    fontSize: fontSize.xl,
    // '700', not the '600' the sibling settings pages still use: Switzer has no
    // 600 cut, so that weight is synthesised. Those pages get it when they are
    // redesigned — see TODO.md.
    fontWeight: '700',
  },
  list: { paddingBottom: spacing.xxl },
  row: {
    paddingVertical: 16,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowText: { flex: 1 },
  rowLabel: { fontSize: fontSize.md },
  rowSub: { fontSize: fontSize.xs, marginTop: 2 },
});

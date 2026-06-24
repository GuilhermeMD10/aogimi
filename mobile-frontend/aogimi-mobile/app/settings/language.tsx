import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import { Screen } from '@/components/ui/Screen';
import { useColors } from '@/theme/ThemeContext';
import { fontFamily, fontSize, spacing } from '@/theme/tokens';
import { LOCALES, useI18n, useT, type Locale } from '@/lib/i18n/I18nContext';

// Language picker. Renders the LOCALES list as a flat list of rows with
// the active locale marked by a checkmark. Selecting a row writes the
// new locale through `setLocale`, which the provider persists to
// AsyncStorage — no manual save step.

export default function LanguageScreen() {
  const c = useColors();
  const t = useT();
  const router = useRouter();
  const { locale, setLocale } = useI18n();

  const pick = (next: Locale) => {
    setLocale(next);
    router.back();
  };

  return (
    <Screen padded>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={styles.backRow}>
          <Feather name="chevron-left" size={22} color={c.fg} />
          <Text style={[styles.backLabel, { color: c.fg }]}>{t('common.back')}</Text>
        </Pressable>
        <Text style={[styles.title, { color: c.fg, fontFamily: fontFamily.ui }]}>
          {t('profile.language')}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {LOCALES.map((entry, i) => {
          const active = entry.code === locale;
          return (
            <Pressable
              key={entry.code}
              onPress={() => pick(entry.code)}
              style={({ pressed }) => [
                styles.row,
                {
                  borderTopWidth: i === 0 ? StyleSheet.hairlineWidth : 0,
                  borderBottomWidth: StyleSheet.hairlineWidth,
                  borderColor: c.border,
                  opacity: pressed ? 0.55 : 1,
                },
              ]}
            >
              <View style={styles.rowText}>
                <Text style={[styles.rowLabel, { color: c.fg }]}>{entry.nativeLabel}</Text>
                {entry.label !== entry.nativeLabel && (
                  <Text style={[styles.rowSub, { color: c.fgMuted }]}>{entry.label}</Text>
                )}
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
    fontWeight: '600',
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

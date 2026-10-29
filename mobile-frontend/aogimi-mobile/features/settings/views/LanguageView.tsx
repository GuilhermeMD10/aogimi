import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Touchable, Screen, BackBar } from '@/shared/components';
import { useRouter } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import { useColors, fontSize, spacing } from '@/theme';
import { LOCALES, useI18n, useT, type Locale } from '@/lib/i18n/I18nContext';

// Language picker. Renders the LOCALES list as a flat list of rows with
// the active locale marked by a checkmark. Selecting a row writes the
// new locale through `setLocale`, which the provider persists to
// AsyncStorage — no manual save step.

export function LanguageView() {
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
      <BackBar title={t('profile.language')} />

      <ScrollView contentContainerStyle={styles.list}>
        {LOCALES.map((entry, i) => {
          const active = entry.code === locale;
          // The language's name in the active language; hidden where it
          // would only repeat the native name (that language's own row).
          const localName = t(`settings.languages.${entry.code}`);
          return (
            <Touchable
              minTarget={false}
              key={entry.code}
              onPress={() => pick(entry.code)}
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
                <Text style={[styles.rowLabel, { color: c.fg }]}>{entry.nativeLabel}</Text>
                {localName !== entry.nativeLabel && (
                  <Text style={[styles.rowSub, { color: c.fgMuted }]}>{localName}</Text>
                )}
              </View>
              {active && <Feather name="check" size={18} color={c.fg} />}
            </Touchable>
          );
        })}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
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

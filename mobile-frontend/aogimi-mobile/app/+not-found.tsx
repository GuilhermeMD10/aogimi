import { useMemo } from 'react';
import { StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, BackBar, Button } from '@/shared/components';
import { usePalette, spacing, type, type Palette } from '@/theme';
import { useT } from '@/lib/i18n/I18nContext';

/**
 * Any URL no route matches — usually a stale deep link. Kept plain on purpose:
 * a heading, one line, and the way home.
 *
 * The back chevron falls back to Home when there is nothing to go back to,
 * which is the normal case for a deep link opened cold.
 */
export default function NotFound() {
  const t = useT();
  const p = usePalette();
  const router = useRouter();
  const styles = useStyles(p);

  const goHome = () => router.replace('/');

  return (
    <Screen padded>
      <BackBar
        title={t('notFound.title')}
        onBack={() => (router.canGoBack() ? router.back() : goHome())}
      />
      <Text style={styles.body}>{t('notFound.body')}</Text>
      <Button label={t('notFound.home')} onPress={goHome} full />
    </Screen>
  );
}

function useStyles(p: Palette) {
  return useMemo(
    () =>
      StyleSheet.create({
        body: { ...type.bodyMd, color: p.muted, marginBottom: spacing.lg },
      }),
    [p],
  );
}

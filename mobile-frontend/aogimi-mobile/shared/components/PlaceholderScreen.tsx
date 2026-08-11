import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColors } from '@/theme/ThemeContext';
import { useT } from '@/lib/i18n/I18nContext';
import { fontFamily, fontSize, spacing } from '@/theme/tokens';

export function PlaceholderScreen({ title, titleKey }: { title?: string; titleKey?: string }) {
  const c = useColors();
  const t = useT();
  const label = title ?? (titleKey ? t(titleKey) : 'Screen');
  return (
    <SafeAreaView style={[styles.root, { backgroundColor: c.bg }]} edges={['top']}>
      <View style={styles.inner}>
        <Text style={[styles.title, { color: c.fg }]}>{label}</Text>
        <Text style={[styles.sub, { color: c.fgMuted }]}>Coming soon</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  inner: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  title: { fontSize: fontSize.xxl, fontFamily: fontFamily.display, marginBottom: spacing.sm },
  sub: { fontSize: fontSize.sm },
});

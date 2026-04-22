import { Redirect, Tabs } from 'expo-router';
import { useColors } from '@/theme/ThemeContext';
import { fontSize } from '@/theme/tokens';
import { useAuth } from '@/lib/auth/AuthContext';
import { useT } from '@/lib/i18n/I18nContext';

export default function TabsLayout() {
  const c = useColors();
  const { status } = useAuth();
  const t = useT();

  if (status === 'signed-out') return <Redirect href="/(auth)/welcome" />;
  if (status === 'loading') return null;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.fg,
        tabBarInactiveTintColor: c.fgSubtle,
        tabBarStyle: {
          backgroundColor: c.bgElev,
          borderTopColor: c.border,
          borderTopWidth: 1,
        },
        tabBarIconStyle: { display: 'none' },
        tabBarLabelStyle: { fontSize: fontSize.xs, fontWeight: '500' },
      }}
    >
      <Tabs.Screen name="index" options={{ title: t('library.title') }} />
      <Tabs.Screen name="reader" options={{ title: 'Reader' }} />
      <Tabs.Screen name="dictionary" options={{ title: t('dict.title') }} />
      <Tabs.Screen name="decks" options={{ title: t('decks.title') }} />
      <Tabs.Screen name="profile" options={{ title: t('profile.title') }} />
    </Tabs>
  );
}

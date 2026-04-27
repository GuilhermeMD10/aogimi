import { Redirect, Tabs } from 'expo-router';
import { useAuth } from '@/lib/auth/AuthContext';
import { useT } from '@/lib/i18n/I18nContext';
import { PillNav } from '@/components/navigation/PillNav';

export default function TabsLayout() {
  const { status } = useAuth();
  const t = useT();

  if (status === 'signed-out') return <Redirect href="/(auth)/welcome" />;
  if (status === 'loading') return null;

  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <PillNav {...props} />}
    >
      <Tabs.Screen name="reader" options={{ tabBarLabel: t('home.title') }} />
      <Tabs.Screen name="dictionary" options={{ tabBarLabel: t('dict.title') }} />
      <Tabs.Screen name="decks" options={{ tabBarLabel: t('decks.title') }} />
      <Tabs.Screen name="profile" options={{ tabBarLabel: t('profile.title') }} />
    </Tabs>
  );
}

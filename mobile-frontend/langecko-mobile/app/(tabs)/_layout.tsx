import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Redirect, Tabs } from 'expo-router';
import { useAuth } from '@/lib/auth/AuthContext';
import { useDeviceRegistration } from '@/lib/useDeviceRegistration';
import { useT } from '@/lib/i18n/I18nContext';
import { NotchedNavBar } from '@/components/navigation/NotchedNavBar';

// Tab declaration order matches NotchedNavBar's SLOTS array:
//   profile · dictionary · reader · decks · settings.
// The bar's notch position is computed from `state.index` against that
// fixed order, so don't reorder these without re-deriving the SLOTS array.
export default function TabsLayout() {
  const { status } = useAuth();
  const t = useT();
  useDeviceRegistration();

  if (status === 'signed-out') return <Redirect href="/(auth)/welcome" />;
  if (status === 'loading') return null;

  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props: BottomTabBarProps) => <NotchedNavBar {...props} />}
    >
      <Tabs.Screen name="profile" options={{ tabBarLabel: t('profile.title') }} />
      <Tabs.Screen name="dictionary" options={{ tabBarLabel: t('dict.title') }} />
      <Tabs.Screen name="reader" options={{ tabBarLabel: t('home.title') }} />
      <Tabs.Screen name="decks" options={{ tabBarLabel: t('decks.title') }} />
      <Tabs.Screen name="settings" options={{ tabBarLabel: t('settings.title') }} />
    </Tabs>
  );
}

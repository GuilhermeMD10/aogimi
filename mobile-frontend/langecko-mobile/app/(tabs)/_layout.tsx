import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Redirect, Tabs } from 'expo-router';
import { useAuth } from '@/lib/auth/AuthContext';
import { useT } from '@/lib/i18n/I18nContext';
import { NotchedNavBar } from '@/components/navigation/NotchedNavBar';
import { useThemedComponent } from '@/themes/useThemedComponent';
import { NavVisibilityProvider, useNavVisibility } from '@/lib/navVisibility';

// Tab declaration order matches the handoff's fixed slot order:
//   profile · dictionary · reader · decks · settings.
// NotchedNavBar computes notch X-coordinates assuming this arrangement, so
// don't reorder these without re-deriving the SLOTS array there too.
export default function TabsLayout() {
  const { status } = useAuth();
  const t = useT();

  if (status === 'signed-out') return <Redirect href="/(auth)/welcome" />;
  if (status === 'loading') return null;

  return (
    <NavVisibilityProvider>
      <Tabs
        screenOptions={{ headerShown: false }}
        tabBar={(props) => <ThemedTabBar {...props} />}
      >
        <Tabs.Screen name="profile" options={{ tabBarLabel: t('profile.title') }} />
        <Tabs.Screen name="dictionary" options={{ tabBarLabel: t('dict.title') }} />
        <Tabs.Screen name="reader" options={{ tabBarLabel: t('home.title') }} />
        <Tabs.Screen name="decks" options={{ tabBarLabel: t('decks.title') }} />
        <Tabs.Screen name="settings" options={{ tabBarLabel: t('settings.title') }} />
      </Tabs>
    </NavVisibilityProvider>
  );
}

function ThemedTabBar(props: BottomTabBarProps) {
  const { visible } = useNavVisibility();
  const Bar = useThemedComponent('BottomTabBar', NotchedNavBar);
  if (!visible) return null;
  return <Bar {...props} />;
}

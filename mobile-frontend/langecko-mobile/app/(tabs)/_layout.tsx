import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Redirect, Tabs } from 'expo-router';
import { useAuth } from '@/lib/auth/AuthContext';
import { useT } from '@/lib/i18n/I18nContext';
import { PillNav } from '@/components/navigation/PillNav';
import { useThemedComponent } from '@/themes/useThemedComponent';
import { NavVisibilityProvider, useNavVisibility } from '@/lib/navVisibility';

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
        <Tabs.Screen name="reader" options={{ tabBarLabel: t('home.title') }} />
        <Tabs.Screen name="dictionary" options={{ tabBarLabel: t('dict.title') }} />
        <Tabs.Screen name="decks" options={{ tabBarLabel: t('decks.title') }} />
        <Tabs.Screen name="profile" options={{ tabBarLabel: t('profile.title') }} />
      </Tabs>
    </NavVisibilityProvider>
  );
}

function ThemedTabBar(props: BottomTabBarProps) {
  const { visible } = useNavVisibility();
  const Bar = useThemedComponent('BottomTabBar', PillNav);
  if (!visible) return null;
  return <Bar {...props} />;
}

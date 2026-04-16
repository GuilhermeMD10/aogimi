import { Tabs } from 'expo-router';
import { useColors } from '@/theme/ThemeContext';
import { fontFamily, fontSize } from '@/theme/tokens';

export default function TabsLayout() {
  const c = useColors();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor:   c.accent,
        tabBarInactiveTintColor: c.textSecondary,
        tabBarStyle: {
          backgroundColor: c.bgSurface,
          borderTopColor:  c.border,
          borderTopWidth:  1,
        },
        tabBarIconStyle: { display: 'none' },
        tabBarLabelStyle: {
          fontFamily: fontFamily.serifSemiBold,
          fontSize: fontSize.sm,
        },
      }}
    >
      <Tabs.Screen name="index"      options={{ href: null }} />
      <Tabs.Screen name="reader"     options={{ title: 'Reader' }} />
      <Tabs.Screen name="dictionary" options={{ title: 'Dictionary' }} />
      <Tabs.Screen name="cards"      options={{ title: 'Cards' }} />
    </Tabs>
  );
}

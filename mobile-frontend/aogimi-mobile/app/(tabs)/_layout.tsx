import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Tabs } from "expo-router";
import { useAuth } from "@/features/auth/providers/AuthContext";
import { useT } from "@/lib/i18n/I18nContext";
import { Dock } from "@/features/app-shell/Dock";
import { DockVisibilityProvider } from "@/features/app-shell/DockVisibility";

// Four tabs: Home · Reader · Dictionary · Sky. Declaration order matches
// `SLOTS` in Dock, which is the render order.
//
// What is deliberately NOT a tab:
//   · Profile / Settings — pushed screens (`/profile`, `/profile/settings`).
//     Profile is reached from Home's header avatar. The dock shows no active
//     tab while they're open.
//   · Decks — there is no decks page; the decks are the Sky. `/sky/[deckId]`
//     and the study routes under it keep the Sky tab lit.
//   · The in-book reader (`/reader/[id]`) — immersive, no dock at all.
//
// Signed-out users render the same tabs; everything operates local-first
// against the same pending pipeline signed-in users use offline.
export default function TabsLayout() {
  const { status } = useAuth();
  const t = useT();

  if (status === "loading") return null;

  return (
    <DockVisibilityProvider>
      <Tabs
        screenOptions={{ headerShown: false }}
        tabBar={(props: BottomTabBarProps) => <Dock {...props} />}
      >
        <Tabs.Screen name="home" options={{ tabBarLabel: t("nav.home") }} />
        <Tabs.Screen name="reader" options={{ tabBarLabel: t("nav.reader") }} />
        <Tabs.Screen
          name="dictionary"
          options={{ tabBarLabel: t("nav.dictionary") }}
        />
        <Tabs.Screen name="sky" options={{ tabBarLabel: t("nav.sky") }} />
      </Tabs>
    </DockVisibilityProvider>
  );
}

import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '@/features/auth/providers/AuthContext';
import { useColors } from '@/theme/ThemeContext';

export default function Index() {
  const { status } = useAuth();
  const c = useColors();

  if (status === 'loading') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: c.bg }}>
        <ActivityIndicator color={c.fg} />
      </View>
    );
  }

  // Both signed-in and signed-out users land in the tabs, on Home — the
  // handoff's first tab, and the only screen carrying the avatar that leads to
  // Profile now that Profile is a pushed screen rather than a tab.
  //
  // Signed-out users use the app local-first; Home → avatar → Profile is where
  // they can sign in to start syncing. Home itself degrades rather than
  // erroring: decks and books read local-first, and due counts come back 0
  // without a server (see useDueCounts).
  return <Redirect href="/(tabs)/home" />;
}

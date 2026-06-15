import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '@/lib/auth/AuthContext';
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

  // Both signed-in and signed-out users land in the tabs. Signed-out
  // users use the app local-first; the Profile tab is where they can
  // sign up / sign in to start syncing.
  return <Redirect href="/(tabs)/reader" />;
}

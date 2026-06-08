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

  // Guest sessions are valid app-state too — route them straight into
  // the tabs. Only the explicit signed-out state goes to /welcome.
  const inApp = status === 'signed-in' || status === 'guest';
  return <Redirect href={inApp ? '/(tabs)/reader' : '/(auth)/welcome'} />;
}

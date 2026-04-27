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

  return <Redirect href={status === 'signed-in' ? '/(tabs)/reader' : '/(auth)/welcome'} />;
}

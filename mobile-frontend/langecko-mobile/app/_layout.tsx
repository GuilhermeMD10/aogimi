import { useCallback } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts,
  Lora_400Regular,
  Lora_600SemiBold,
  Lora_700Bold,
  Lora_400Regular_Italic,
} from '@expo-google-fonts/lora';
import { ThemeProvider, useTheme } from '@/theme/ThemeContext';
import { I18nProvider } from '@/lib/i18n/I18nContext';
import { AuthProvider } from '@/lib/auth/AuthContext';

SplashScreen.preventAutoHideAsync();

// Note on Android nav bar: we previously installed a custom immersive
// behavior via expo-navigation-bar (setPosition / setBehavior / hide). All
// of those are no-ops + warn under edge-to-edge mode, which is the Expo
// SDK 52+ default — and edge-to-edge already gives us the "content draws
// under the system bars" look without manual API calls. If you ever need
// the swipe-to-reveal immersive variant back, it has to be set up via the
// Android theme (app.json android plugin) rather than the JS API.

export default function RootLayout() {
  const [fontsLoaded, fontsError] = useFonts({
    Lora_400Regular,
    Lora_600SemiBold,
    Lora_700Bold,
    Lora_400Regular_Italic,
  });

  const onLayoutReady = useCallback(() => {
    if (fontsLoaded || fontsError) SplashScreen.hideAsync();
  }, [fontsLoaded, fontsError]);

  if (!fontsLoaded && !fontsError) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider onLayout={onLayoutReady}>
        <ThemeProvider>
          <I18nProvider>
            <AuthProvider>
              <ThemedStatusBar />
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="index" />
                <Stack.Screen name="(auth)" />
                <Stack.Screen name="(tabs)" />
              </Stack>
            </AuthProvider>
          </I18nProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function ThemedStatusBar() {
  const { theme } = useTheme();
  return <StatusBar style={theme.meta.isDark ? 'light' : 'dark'} />;
}

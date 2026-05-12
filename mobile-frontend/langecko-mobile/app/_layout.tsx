import { useCallback, useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as NavigationBar from 'expo-navigation-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
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

// Android-only: hide the system navigation bar and put it in immersive-sticky
// mode -- swipe up from the bottom reveals it as a transient overlay, it
// auto-hides when not in use. On iOS this is a no-op. We re-apply on app
// resume because Android sometimes restores the bar after backgrounding.
function useImmersiveNavBar() {
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const apply = async () => {
      try {
        // 'absolute' lets our content draw under the bar's area, so when the
        // bar reappears as an overlay the layout doesn't shift.
        await NavigationBar.setPositionAsync('absolute');
        // 'overlay-swipe' = immersive sticky -- swipe up to reveal, auto-hides.
        await NavigationBar.setBehaviorAsync('overlay-swipe');
        await NavigationBar.setVisibilityAsync('hidden');
      } catch {
        /* device may not support; nothing to fall back to */
      }
    };
    void apply();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void apply();
    });
    return () => sub.remove();
  }, []);
}

export default function RootLayout() {
  useImmersiveNavBar();
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
  );
}

function ThemedStatusBar() {
  const { theme } = useTheme();
  return <StatusBar style={theme.meta.isDark ? 'light' : 'dark'} />;
}

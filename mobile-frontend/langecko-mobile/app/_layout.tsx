import { useCallback } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts,
  Lora_400Regular,
  Lora_600SemiBold,
  Lora_700Bold,
  Lora_400Regular_Italic,
} from '@expo-google-fonts/lora';
import { ThemeProvider, useThemeMode } from '@/theme/ThemeContext';
import { DictionaryDrawerProvider } from '@/components/layout/DictionaryDrawerContext';
import { DictionaryDrawer } from '@/components/layout/DictionaryDrawer';
import { ReaderStateProvider } from '@/components/providers/ReaderStateContext';
import { PendingCardOverlay } from '@/components/cards/PendingCardOverlay';

SplashScreen.preventAutoHideAsync();

/**
 * Root providers + font loading.
 *
 * Provider order (outermost → innermost):
 *   SafeAreaProvider → ThemeProvider → ReaderStateProvider → DictionaryDrawerProvider
 *
 * Overlays (DictionaryDrawer, PendingCardOverlay) float above every route.
 */
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
    <SafeAreaProvider onLayout={onLayoutReady}>
      <ThemeProvider>
        <ReaderStateProvider>
          <DictionaryDrawerProvider>
            <ThemedStatusBar />
            <Stack screenOptions={{ headerShown: false }} />
            <DictionaryDrawer />
            <PendingCardOverlay />
          </DictionaryDrawerProvider>
        </ReaderStateProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

function ThemedStatusBar() {
  const { mode } = useThemeMode();
  return <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />;
}

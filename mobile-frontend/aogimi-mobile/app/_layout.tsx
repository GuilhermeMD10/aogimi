import { useCallback, useEffect, useState } from 'react';
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
import {
  NotoSansJP_400Regular,
  NotoSansJP_500Medium,
  NotoSansJP_700Bold,
} from '@expo-google-fonts/noto-sans-jp';
import { switzerFonts } from '@/theme/switzer';
import { ThemeProvider, useTheme } from '@/theme/ThemeContext';
import { I18nProvider } from '@/lib/i18n/I18nContext';
import { AuthProvider } from '@/features/auth/providers/AuthContext';
import { getDictionary } from '@/features/dictionary/lib/openDictionary';
import { ensureLocalSchema } from '@/lib/localSchema';
import { initNetwork } from '@/lib/network/network';
import { useHideAndroidNavBar } from '@/lib/useHideAndroidNavBar';

SplashScreen.preventAutoHideAsync();

// Note on Android nav bar: we previously installed a custom immersive
// behavior via expo-navigation-bar (setPosition / setBehavior / hide). All
// of those are no-ops + warn under edge-to-edge mode, which is the Expo
// SDK 52+ default — and edge-to-edge already gives us the "content draws
// under the system bars" look without manual API calls. If you ever need
// the swipe-to-reveal immersive variant back, it has to be set up via the
// Android theme (app.json android plugin) rather than the JS API.

export default function RootLayout() {
  // App-wide Android nav-bar hide. RootLayout never unmounts, so the
  // bar stays hidden for the whole app lifetime.
  useHideAndroidNavBar();

  // Install the NetInfo subscription once at app start. The returned
  // unsubscribe is intentionally ignored — RootLayout lives for the
  // whole app lifetime, so there's nothing to clean up.
  useEffect(() => {
    initNetwork();
  }, []);

  // Three families, three roles. **Switzer is the app's Latin UI face and is
  // not in the repo yet** — `theme/switzer.ts` explains why and how to add it;
  // until then `switzerFonts` spreads to nothing and the UI roles resolve to
  // the platform sans. Noto Sans JP carries every Japanese glyph in the app,
  // Lora is the reader's body face only.
  const [fontsLoaded, fontsError] = useFonts({
    Lora_400Regular,
    Lora_600SemiBold,
    Lora_700Bold,
    Lora_400Regular_Italic,
    NotoSansJP_400Regular,
    NotoSansJP_500Medium,
    NotoSansJP_700Bold,
    ...switzerFonts,
  });

  // First-launch dictionary setup. `getDictionary()` copies the
  // bundled SQLite (~250 MB) into documentDirectory the first time
  // the app runs after install (or after a version bump). On every
  // subsequent launch it's a no-op cache hit. The splash stays up
  // until both fonts AND dictionary are ready.
  const [dictReady, setDictReady] = useState(false);
  const [dictError, setDictError] = useState<Error | null>(null);
  useEffect(() => {
    let cancelled = false;
    getDictionary()
      .then(() => { if (!cancelled) setDictReady(true); })
      .catch((err) => { if (!cancelled) setDictError(err); });
    return () => { cancelled = true; };
  }, []);

  // Local-store schema gate. Gated on in `allReady` rather than fired and
  // forgotten: it drops the decks/cards stores when the build's schema version
  // moved, so it has to finish before any screen reads them. It swallows its
  // own errors, so there is no error branch to track.
  const [schemaReady, setSchemaReady] = useState(false);
  useEffect(() => {
    let cancelled = false;
    ensureLocalSchema().finally(() => { if (!cancelled) setSchemaReady(true); });
    return () => { cancelled = true; };
  }, []);

  const allReady = (fontsLoaded || fontsError) && (dictReady || dictError) && schemaReady;


  const onLayoutReady = useCallback(() => {
    if (allReady) SplashScreen.hideAsync();
  }, [allReady]);

  if (!allReady) return null;

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

import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as NavigationBar from 'expo-navigation-bar';

/**
 * Hides the Android system navigation bar while the calling screen is
 * mounted, and restores it on unmount. iOS is a no-op.
 *
 * Edge-to-edge note: under SDK 52+'s default edge-to-edge mode the bar's
 * *position* and *behavior* can't be changed from JS, but `setVisibility`
 * still works to hide/show. We deliberately avoid `setBehaviorAsync` here
 * (it warns under edge-to-edge); the OS handles the "tap to reveal"
 * behavior with its own defaults.
 */
export function useHideAndroidNavBar(active: boolean = true): void {
  useEffect(() => {
    if (Platform.OS !== 'android' || !active) return;
    void NavigationBar.setVisibilityAsync('hidden').catch(() => undefined);
    return () => {
      void NavigationBar.setVisibilityAsync('visible').catch(() => undefined);
    };
  }, [active]);
}

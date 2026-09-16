import { Redirect } from 'expo-router';
import { DockLabView } from '@/features/app-shell/dockLab/DockLabView';

/**
 * Dev-only. The route file still ships — expo-router builds its map from the
 * filesystem, so there is no way to leave it out of a release bundle — but in
 * one it redirects back to Settings, where the row that leads here is not drawn
 * either. Belt and braces, because a deep link does not go through the row.
 *
 * __DEV__ is false in a Release build even for the "dev" bundle id, so this
 * also allows the build-time flag the build script sets for that variant
 * (same mechanism as EXPO_PUBLIC_API_URL).
 */
const DEV_TOOLS_ENABLED = __DEV__ || process.env.EXPO_PUBLIC_DEV_TOOLS === '1';

export default function DockLabRoute() {
  if (!DEV_TOOLS_ENABLED) return <Redirect href="/profile/settings" />;
  return <DockLabView />;
}

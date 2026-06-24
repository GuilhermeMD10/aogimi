import { isAppTheme, type AppTheme } from '@/components/providers/ThemeProvider';
import { getString, setString } from './_helpers';

const KEY = 'app-theme';

export function getStoredTheme(): AppTheme | null {
  const raw = getString(KEY);
  return isAppTheme(raw) ? raw : null;
}

export function setStoredTheme(theme: AppTheme): void {
  setString(KEY, theme);
}

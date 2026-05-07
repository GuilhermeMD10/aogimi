import type { AppTheme } from '@/components/providers/ThemeProvider';
import { getString, setString } from './_helpers';

const KEY = 'app-theme';
const VALID: AppTheme[] = ['default', 'kanagawa', 'sakura', 'hanami', 'stamp'];

export function getStoredTheme(): AppTheme | null {
  const raw = getString(KEY);
  return raw && (VALID as string[]).includes(raw) ? (raw as AppTheme) : null;
}

export function setStoredTheme(theme: AppTheme): void {
  setString(KEY, theme);
}

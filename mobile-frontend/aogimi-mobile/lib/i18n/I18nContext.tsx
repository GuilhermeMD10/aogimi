import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import en from './en.json';
import ja from './ja.json';
import pt from './pt.json';

export type Locale = 'en' | 'ja' | 'pt';

export const LOCALES: { code: Locale; label: string; nativeLabel: string }[] = [
  { code: 'en', label: 'English', nativeLabel: 'English' },
  { code: 'ja', label: 'Japanese', nativeLabel: '日本語' },
  { code: 'pt', label: 'Portuguese', nativeLabel: 'Português' },
];

type Bundle = Record<string, unknown>;

const BUNDLES: Record<Locale, Bundle> = { en, ja, pt };

const STORAGE_KEY = 'aogimi_locale';
const DEFAULT_LOCALE: Locale = 'en';

function isLocale(v: unknown): v is Locale {
  // Derived from the LOCALES list so adding a new locale is a single
  // edit. Previously this was a hardcoded triple check that would have
  // silently rejected any newly-added locale until manually updated.
  return LOCALES.some((l) => l.code === v);
}

type I18nContextValue = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
};

const I18nCtx = createContext<I18nContextValue | null>(null);

function resolve(bundle: Bundle, key: string): string | undefined {
  const parts = key.split('.');
  let cur: unknown = bundle;
  for (const p of parts) {
    if (cur && typeof cur === 'object' && p in (cur as Record<string, unknown>)) {
      cur = (cur as Record<string, unknown>)[p];
    } else {
      return undefined;
    }
  }
  return typeof cur === 'string' ? cur : undefined;
}

function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, name: string) =>
    name in params ? String(params[name]) : `{${name}}`,
  );
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  // Hydrate from storage on mount. Until this resolves we render with
  // English — the first paint is a few hundred ms and AsyncStorage is
  // fast, so the locale flip is visually unobtrusive.
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (isLocale(stored)) setLocaleState(stored);
    });
  }, []);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    void AsyncStorage.setItem(STORAGE_KEY, l);
  }, []);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>) => {
      // Active-locale resolve, then English fallback, then raw key as a
      // last resort so a missing translation surfaces visibly during dev.
      const raw = resolve(BUNDLES[locale], key) ?? resolve(BUNDLES.en, key) ?? key;
      return interpolate(raw, params);
    },
    [locale],
  );

  const value = useMemo<I18nContextValue>(() => ({ locale, setLocale, t }), [locale, setLocale, t]);
  return <I18nCtx.Provider value={value}>{children}</I18nCtx.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nCtx);
  if (!ctx) throw new Error('useI18n must be inside <I18nProvider>');
  return ctx;
}

export function useT(): I18nContextValue['t'] {
  return useI18n().t;
}

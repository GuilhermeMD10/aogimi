import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import en from './en.json';

type Locale = 'en';

type Bundle = Record<string, unknown>;

const BUNDLES: Record<Locale, Bundle> = { en };

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
  const [locale, setLocale] = useState<Locale>('en');

  const t = useCallback(
    (key: string, params?: Record<string, string | number>) => {
      const raw = resolve(BUNDLES[locale], key) ?? resolve(BUNDLES.en, key) ?? key;
      return interpolate(raw, params);
    },
    [locale],
  );

  const value = useMemo<I18nContextValue>(() => ({ locale, setLocale, t }), [locale, t]);
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

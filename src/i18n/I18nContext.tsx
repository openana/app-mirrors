import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import en_us from './locales/en_us.json';
import zh_cn from './locales/zh_cn.json';

export type Locale = 'en_us' | 'zh_cn';

const LOCALES: Record<Locale, typeof en_us> = { en_us, zh_cn };

const LOCALE_LABELS: Record<Locale, string> = {
  en_us: 'English',
  zh_cn: '中文',
};

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
  localeLabels: typeof LOCALE_LABELS;
}

const I18nContext = createContext<I18nContextValue | null>(null);

function getNestedValue(obj: Record<string, unknown>, path: string): string | undefined {
  const parts = path.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === 'string' ? current : undefined;
}

function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, key: string) =>
    vars[key] !== undefined ? String(vars[key]) : `{${key}}`,
  );
}

function getInitialLocale(): Locale {
  try {
    const saved = localStorage.getItem('mirrorz-locale');
    if (saved === 'en_us' || saved === 'zh_cn') return saved;
  } catch {
    // localStorage may be unavailable
  }
  // Detect browser language
  const lang = navigator.language.toLowerCase();
  if (lang.startsWith('zh')) return 'zh_cn';
  return 'en_us';
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(getInitialLocale);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    try {
      localStorage.setItem('mirrorz-locale', l);
    } catch {
      // localStorage may be unavailable
    }
  }, []);

  // Update html lang attribute
  useEffect(() => {
    document.documentElement.lang = locale === 'zh_cn' ? 'zh-CN' : 'en';
  }, [locale]);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>): string => {
      const value = getNestedValue(LOCALES[locale] as Record<string, unknown>, key);
      if (value !== undefined) return interpolate(value, vars);
      // Fallback to en_us
      const fallback = getNestedValue(LOCALES.en_us as Record<string, unknown>, key);
      if (fallback !== undefined) return interpolate(fallback, vars);
      return key;
    },
    [locale],
  );

  return (
    <I18nContext.Provider value={{ locale, setLocale, t, localeLabels: LOCALE_LABELS }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useTranslation() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useTranslation must be used within I18nProvider');
  return ctx;
}

export function useLocale() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useLocale must be used within I18nProvider');
  return { locale: ctx.locale, setLocale: ctx.setLocale, localeLabels: ctx.localeLabels };
}
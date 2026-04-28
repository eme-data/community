'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  DEFAULT_LOCALE,
  I18nContext,
  Locale,
  dictionary,
  readLocaleCookie,
  writeLocaleCookie,
} from '@/lib/i18n';

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState<Locale>(DEFAULT_LOCALE);

  useEffect(() => {
    setLocale(readLocaleCookie());
  }, []);

  const value = useMemo(() => ({ locale, t: dictionary[locale] }), [locale]);

  // Expose a global helper so non-React code (e.g. the locale switcher) can
  // change the language and trigger a re-render.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    (window as any).__community_setLocale = (next: Locale) => {
      writeLocaleCookie(next);
      setLocale(next);
    };
  }, []);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

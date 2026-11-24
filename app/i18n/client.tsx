// Copyright (c) Meta Platforms, Inc. and affiliates.
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

'use client';

import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';

import { LOCALE_COOKIE, intlLocale, makeT, type Locale, type T } from '@/app/i18n/locale';

interface LocaleContextValue {
  locale: Locale;
  t: T;
}

// Without a provider (e.g. in unit tests) components render their English text.
export const LocaleContext = createContext<LocaleContextValue>({ locale: 'en', t: makeT('en') });

export function LocaleProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  const value = useMemo(() => ({ locale, t: makeT(locale) }), [locale]);
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): Locale {
  return useContext(LocaleContext).locale;
}

export function useT(): T {
  return useContext(LocaleContext).t;
}

export function useIntlLocale(): string {
  return intlLocale(useLocale());
}

/** Persists the chosen language in a cookie and re-renders server components. */
export function useSetLocale(): (locale: Locale) => void {
  const router = useRouter();
  return useCallback(
    (locale: Locale) => {
      document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=31536000; samesite=lax`;
      document.documentElement.lang = locale;
      router.refresh();
    },
    [router],
  );
}

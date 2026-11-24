// Copyright (c) Meta Platforms, Inc. and affiliates.
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

// Shared locale primitives usable from both server and client code.

export type Locale = 'tr' | 'en';

export const LOCALES: Locale[] = ['tr', 'en'];
export const DEFAULT_LOCALE: Locale = 'tr';
export const LOCALE_COOKIE = 'lang';

/** Translator: pass the English and Turkish text, get back the active one. */
export type T = (en: string, tr: string) => string;

export function normalizeLocale(value: string | undefined | null): Locale {
  return value === 'en' || value === 'tr' ? value : DEFAULT_LOCALE;
}

export function makeT(locale: Locale): T {
  return (en, tr) => (locale === 'tr' ? tr : en);
}

/** BCP-47 tag for Intl date/number formatting. */
export function intlLocale(locale: Locale): string {
  return locale === 'tr' ? 'tr-TR' : 'en-US';
}

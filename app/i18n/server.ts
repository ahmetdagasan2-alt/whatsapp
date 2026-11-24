// Copyright (c) Meta Platforms, Inc. and affiliates.
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

import { cookies } from 'next/headers';

import { LOCALE_COOKIE, makeT, normalizeLocale, type Locale, type T } from '@/app/i18n/locale';

export async function getLocale(): Promise<Locale> {
  const store = await cookies();
  return normalizeLocale(store.get(LOCALE_COOKIE)?.value);
}

export async function getT(): Promise<T> {
  return makeT(await getLocale());
}

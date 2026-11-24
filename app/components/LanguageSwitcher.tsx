// Copyright (c) Meta Platforms, Inc. and affiliates.
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

'use client';

import { Languages } from 'lucide-react';

import { useLocale, useSetLocale } from '@/app/i18n/client';
import { LOCALES, type Locale } from '@/app/i18n/locale';
import { cn } from '@/lib/utils';

const LABELS: Record<Locale, string> = { tr: 'Türkçe', en: 'English' };

export default function LanguageSwitcher({
  className,
  tone = 'light',
}: {
  className?: string;
  tone?: 'light' | 'dark';
}) {
  const locale = useLocale();
  const setLocale = useSetLocale();

  return (
    <div
      role="radiogroup"
      aria-label="Dil / Language"
      className={cn(
        'inline-flex items-center gap-1 rounded-lg p-1 text-xs font-semibold',
        tone === 'dark' ? 'bg-white/10 ring-1 ring-white/20' : 'bg-slate-100',
        className,
      )}
    >
      <Languages className={cn('w-3.5 h-3.5 mx-1', tone === 'dark' ? 'text-white/70' : 'text-slate-400')} />
      {LOCALES.map((l) => (
        <button
          key={l}
          type="button"
          role="radio"
          aria-checked={locale === l}
          title={LABELS[l]}
          onClick={() => locale !== l && setLocale(l)}
          className={cn(
            'px-2.5 py-1 rounded-md uppercase transition-colors',
            locale === l
              ? tone === 'dark'
                ? 'bg-white text-brand-800 shadow-sm'
                : 'bg-white text-brand-700 shadow-sm'
              : tone === 'dark'
                ? 'text-white/70 hover:text-white'
                : 'text-slate-500 hover:text-slate-800',
          )}
        >
          {l}
        </button>
      ))}
    </div>
  );
}

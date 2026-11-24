// Copyright (c) Meta Platforms, Inc. and affiliates.
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

'use client';

import { forwardRef, useEffect, useMemo, useRef, useState, type InputHTMLAttributes, type ReactNode } from 'react';
import { AlertCircle, ChevronDown, Eye, EyeOff, Loader2, Search } from 'lucide-react';
import type { CountryCode } from 'libphonenumber-js/min';

import { useLocale, useT } from '@/app/i18n/client';
import { getCountryOptions } from '@/lib/auth/phone';
import { cn } from '@/lib/utils';

export const inputClass =
  'w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-white text-[15px] text-slate-900 placeholder:text-slate-400 transition-colors focus:outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-500/10 disabled:bg-slate-50 disabled:text-slate-400';

export function Field({ label, htmlFor, children, hint }: { label: string; htmlFor?: string; children: ReactNode; hint?: string }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-slate-700 mb-1.5">
        {label}
      </label>
      {children}
      {hint && <p className="mt-1.5 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

export const TextInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => <input ref={ref} className={cn(inputClass, className)} {...props} />,
);
TextInput.displayName = 'TextInput';

export function PasswordInput(props: InputHTMLAttributes<HTMLInputElement>) {
  const t = useT();
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input {...props} type={visible ? 'text' : 'password'} className={cn(inputClass, 'pr-11')} />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute inset-y-0 right-0 px-3 text-slate-400 hover:text-slate-600"
        aria-label={visible ? t('Hide password', 'Şifreyi gizle') : t('Show password', 'Şifreyi göster')}
      >
        {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
}

export function SubmitButton({ loading, children, disabled }: { loading?: boolean; children: ReactNode; disabled?: boolean }) {
  return (
    <button
      type="submit"
      disabled={loading || disabled}
      className="w-full h-12 inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 text-white font-semibold shadow-sm shadow-brand-600/30 hover:bg-brand-700 active:bg-brand-800 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </button>
  );
}

export function FormError({ message }: { message: string }) {
  if (!message) return null;
  return (
    <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-700">
      <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
      <span>{message}</span>
    </div>
  );
}

/** Country dial-code picker (all countries, searchable) + national number field. */
export function PhoneInput({
  country,
  onCountryChange,
  value,
  onChange,
  id,
}: {
  country: CountryCode;
  onCountryChange: (c: CountryCode) => void;
  value: string;
  onChange: (v: string) => void;
  id?: string;
}) {
  const t = useT();
  const locale = useLocale();
  const options = useMemo(() => getCountryOptions(locale), [locale]);
  const selected = options.find((o) => o.iso === country);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return undefined;
    searchRef.current?.focus();
    const onDown = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const q = query.trim().toLocaleLowerCase(locale === 'tr' ? 'tr-TR' : 'en-US');
  const filtered = q
    ? options.filter(
        (o) =>
          o.name.toLocaleLowerCase(locale === 'tr' ? 'tr-TR' : 'en-US').includes(q) ||
          o.dialCode.includes(q.replace(/^\+?/, '+')) ||
          o.iso.toLowerCase() === q,
      )
    : options;

  return (
    <div ref={wrapperRef} className="relative flex gap-2">
      <button
        type="button"
        onClick={() => {
          setQuery('');
          setOpen((v) => !v);
        }}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t('Country code', 'Ülke kodu')}
        className="h-11 flex-shrink-0 inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-[15px] text-slate-800 hover:border-slate-300 focus:outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-500/10"
      >
        <span className="text-lg leading-none">{selected?.flag}</span>
        <span className="font-medium tabular-nums">{selected?.dialCode}</span>
        <ChevronDown className={cn('w-4 h-4 text-slate-400 transition-transform', open && 'rotate-180')} />
      </button>
      <input
        id={id}
        type="tel"
        inputMode="tel"
        autoComplete="tel-national"
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/[^\d\s()-]/g, ''))}
        placeholder={country === 'TR' ? '532 123 45 67' : t('Phone number', 'Telefon numarası')}
        className={inputClass}
      />

      {open && (
        <div className="absolute left-0 top-full mt-2 z-50 w-full sm:w-96 rounded-xl border border-slate-200 bg-white shadow-xl overflow-hidden">
          <div className="relative border-b border-slate-100">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('Search country or code', 'Ülke veya kod ara')}
              className="w-full h-11 pl-10 pr-3 text-sm focus:outline-none"
            />
          </div>
          <ul role="listbox" className="max-h-64 overflow-y-auto py-1">
            {filtered.length === 0 && (
              <li className="px-4 py-3 text-sm text-slate-400">{t('No results', 'Sonuç bulunamadı')}</li>
            )}
            {filtered.map((o) => (
              <li key={o.iso}>
                <button
                  type="button"
                  role="option"
                  aria-selected={o.iso === country}
                  onClick={() => {
                    onCountryChange(o.iso);
                    setOpen(false);
                  }}
                  className={cn(
                    'w-full flex items-center gap-3 px-4 py-2 text-left text-sm hover:bg-slate-50',
                    o.iso === country && 'bg-brand-50 text-brand-800',
                  )}
                >
                  <span className="text-lg leading-none">{o.flag}</span>
                  <span className="flex-1 truncate">{o.name}</span>
                  <span className="text-slate-400 tabular-nums">{o.dialCode}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/** Six separate digit boxes with paste support. */
export function OtpInput({ value, onChange, disabled }: { value: string; onChange: (v: string) => void; disabled?: boolean }) {
  const t = useT();
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = Array.from({ length: 6 }, (_, i) => value[i] ?? '');

  const setAt = (index: number, digit: string) => {
    const next = digits.slice();
    next[index] = digit;
    onChange(next.join('').slice(0, 6));
  };

  return (
    <div className="flex justify-between gap-2" aria-label={t('Verification code', 'Doğrulama kodu')}>
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          value={d}
          disabled={disabled}
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          autoFocus={i === 0}
          onChange={(e) => {
            const v = e.target.value.replace(/\D/g, '');
            if (v.length > 1) {
              onChange(v.slice(0, 6));
              refs.current[Math.min(v.length, 6) - 1]?.focus();
              return;
            }
            setAt(i, v);
            if (v && i < 5) refs.current[i + 1]?.focus();
          }}
          onKeyDown={(e) => {
            if (e.key === 'Backspace' && !digits[i] && i > 0) refs.current[i - 1]?.focus();
          }}
          onPaste={(e) => {
            const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
            if (pasted) {
              e.preventDefault();
              onChange(pasted);
              refs.current[Math.min(pasted.length, 6) - 1]?.focus();
            }
          }}
          className="w-12 h-14 sm:w-14 rounded-xl border border-slate-200 bg-white text-center text-2xl font-semibold text-slate-900 focus:outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-500/10 disabled:bg-slate-50"
        />
      ))}
    </div>
  );
}

/** "Resend code" link with a countdown. */
export function ResendCode({ seconds, onResend }: { seconds: number; onResend: () => Promise<void> }) {
  const t = useT();
  const [left, setLeft] = useState(seconds);
  const [busy, setBusy] = useState(false);

  useEffect(() => setLeft(seconds), [seconds]);
  useEffect(() => {
    if (left <= 0) return undefined;
    const timer = setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [left]);

  if (left > 0) {
    return (
      <span className="text-sm text-slate-400">
        {t('Resend code in', 'Kodu tekrar gönder:')} 0:{String(left).padStart(2, '0')}
      </span>
    );
  }
  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await onResend();
          setLeft(60);
        } finally {
          setBusy(false);
        }
      }}
      className="text-sm font-medium text-brand-600 hover:text-brand-700 disabled:opacity-50"
    >
      {t('Resend code', 'Kodu tekrar gönder')}
    </button>
  );
}

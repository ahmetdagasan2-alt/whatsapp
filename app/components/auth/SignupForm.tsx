// Copyright (c) Meta Platforms, Inc. and affiliates.
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, MessageCircle } from 'lucide-react';
import type { CountryCode } from 'libphonenumber-js/min';

import { authErrorMessage, authPost } from '@/app/components/auth/authClient';
import {
  Field,
  FormError,
  OtpInput,
  PasswordInput,
  PhoneInput,
  ResendCode,
  SubmitButton,
  TextInput,
} from '@/app/components/auth/fields';
import { useT } from '@/app/i18n/client';
import { toE164 } from '@/lib/auth/phone';

interface StartResponse {
  requestId: string;
  phoneMasked: string;
  resendAfter: number;
}

export default function SignupForm() {
  const t = useT();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [country, setCountry] = useState<CountryCode>('TR');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');

  const [pending, setPending] = useState<StartResponse | null>(null);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const phoneInvalid = phone.trim() !== '' && !toE164(country, phone);

  if (pending) {
    return (
      <form
        className="space-y-6"
        onSubmit={async (e) => {
          e.preventDefault();
          setLoading(true);
          setError('');
          try {
            await authPost('signup/verify', { requestId: pending.requestId, code });
            window.location.assign('/');
          } catch (err) {
            setError(authErrorMessage(err, t));
            setCode('');
            setLoading(false);
          }
        }}
      >
        <div className="flex items-start gap-3 rounded-xl bg-[#25D366]/10 px-4 py-3.5 text-sm text-slate-700">
          <MessageCircle className="w-5 h-5 text-[#128C7E] flex-shrink-0 mt-0.5" />
          <p>
            {t('We sent a 6-digit code via WhatsApp to', '6 haneli doğrulama kodunu WhatsApp üzerinden şu numaraya gönderdik:')}{' '}
            <strong className="whitespace-nowrap">{pending.phoneMasked}</strong>
          </p>
        </div>

        <OtpInput value={code} onChange={setCode} disabled={loading} />

        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              setPending(null);
              setCode('');
              setError('');
            }}
            className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('Change number', 'Numarayı değiştir')}
          </button>
          <ResendCode
            seconds={pending.resendAfter}
            onResend={async () => {
              setError('');
              try {
                await authPost('otp/resend', { requestId: pending.requestId });
              } catch (err) {
                setError(authErrorMessage(err, t));
              }
            }}
          />
        </div>

        <FormError message={error} />

        <SubmitButton loading={loading} disabled={code.length !== 6}>
          {t('Verify and create account', 'Doğrula ve hesabı oluştur')}
        </SubmitButton>
      </form>
    );
  }

  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setError('');
        if (password !== password2) {
          setError(t('Passwords do not match.', 'Şifreler eşleşmiyor.'));
          return;
        }
        if (phoneInvalid || !phone.trim()) {
          setError(
            t('This phone number is not valid for the selected country.', 'Bu telefon numarası seçilen ülke için geçerli değil.'),
          );
          return;
        }
        setLoading(true);
        try {
          const res = await authPost<StartResponse>('signup/start', {
            firstName,
            lastName,
            email,
            country,
            phone,
            password,
          });
          setPending(res);
        } catch (err) {
          setError(authErrorMessage(err, t));
        } finally {
          setLoading(false);
        }
      }}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label={t('First name', 'Ad')} htmlFor="su-first">
          <TextInput
            id="su-first"
            autoComplete="given-name"
            required
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
          />
        </Field>
        <Field label={t('Last name', 'Soyad')} htmlFor="su-last">
          <TextInput
            id="su-last"
            autoComplete="family-name"
            required
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
          />
        </Field>
      </div>

      <Field label={t('Email', 'E-posta')} htmlFor="su-email">
        <TextInput
          id="su-email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="ornek@sirket.com"
        />
      </Field>

      <Field
        label={t('Phone number', 'Telefon numarası')}
        htmlFor="su-phone"
        hint={t(
          'A verification code will be sent to this number via WhatsApp.',
          'Bu numaraya WhatsApp üzerinden doğrulama kodu gönderilecek.',
        )}
      >
        <PhoneInput id="su-phone" country={country} onCountryChange={setCountry} value={phone} onChange={setPhone} />
        {phoneInvalid && (
          <p className="mt-1.5 text-xs text-red-600">
            {t('Not a valid number for this country.', 'Bu ülke için geçerli bir numara değil.')}
          </p>
        )}
      </Field>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label={t('Password', 'Şifre')} htmlFor="su-pass" hint={t('At least 8 characters', 'En az 8 karakter')}>
          <PasswordInput
            id="su-pass"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
        <Field label={t('Repeat password', 'Şifre (tekrar)')} htmlFor="su-pass2">
          <PasswordInput
            id="su-pass2"
            autoComplete="new-password"
            required
            minLength={8}
            value={password2}
            onChange={(e) => setPassword2(e.target.value)}
          />
        </Field>
      </div>

      <FormError message={error} />

      <div className="pt-1">
        <SubmitButton loading={loading}>{t('Continue', 'Devam Et')}</SubmitButton>
      </div>

      <p className="text-center text-sm text-slate-500">
        {t('Already have an account?', 'Zaten hesabınız var mı?')}{' '}
        <Link href="/login" className="font-semibold text-brand-600 hover:text-brand-700">
          {t('Log in', 'Giriş yapın')}
        </Link>
      </p>
    </form>
  );
}

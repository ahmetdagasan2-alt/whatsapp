// Copyright (c) Meta Platforms, Inc. and affiliates.
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { MessageCircle } from 'lucide-react';

import { authErrorMessage, authPost } from '@/app/components/auth/authClient';
import { Field, FormError, OtpInput, PasswordInput, ResendCode, SubmitButton, TextInput } from '@/app/components/auth/fields';
import { useT } from '@/app/i18n/client';

interface StartResponse {
  requestId: string;
  resendAfter: number;
}

export default function ForgotPasswordForm() {
  const t = useT();
  const [email, setEmail] = useState('');
  const [pending, setPending] = useState<StartResponse | null>(null);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!pending) {
    return (
      <form
        className="space-y-5"
        onSubmit={async (e) => {
          e.preventDefault();
          setLoading(true);
          setError('');
          try {
            setPending(await authPost<StartResponse>('password/forgot', { email }));
          } catch (err) {
            setError(authErrorMessage(err, t));
          } finally {
            setLoading(false);
          }
        }}
      >
        <Field
          label={t('Email', 'E-posta')}
          htmlFor="fp-email"
          hint={t(
            'We will send a code via WhatsApp to the phone number on your account.',
            'Hesabınızdaki telefon numarasına WhatsApp üzerinden bir kod göndereceğiz.',
          )}
        >
          <TextInput
            id="fp-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="ornek@sirket.com"
          />
        </Field>
        <FormError message={error} />
        <SubmitButton loading={loading}>{t('Send code', 'Kod Gönder')}</SubmitButton>
        <p className="text-center text-sm text-slate-500">
          <Link href="/login" className="font-semibold text-brand-600 hover:text-brand-700">
            {t('Back to log in', 'Girişe dön')}
          </Link>
        </p>
      </form>
    );
  }

  return (
    <form
      className="space-y-5"
      onSubmit={async (e) => {
        e.preventDefault();
        setError('');
        if (password !== password2) {
          setError(t('Passwords do not match.', 'Şifreler eşleşmiyor.'));
          return;
        }
        setLoading(true);
        try {
          await authPost('password/reset', { requestId: pending.requestId, code, password });
          window.location.assign('/');
        } catch (err) {
          setError(authErrorMessage(err, t));
          setLoading(false);
        }
      }}
    >
      <div className="flex items-start gap-3 rounded-xl bg-[#25D366]/10 px-4 py-3.5 text-sm text-slate-700">
        <MessageCircle className="w-5 h-5 text-[#128C7E] flex-shrink-0 mt-0.5" />
        <p>
          {t(
            'If an account exists for this email, a 6-digit code was sent via WhatsApp to its phone number.',
            'Bu e-postaya ait bir hesap varsa, kayıtlı telefon numarasına WhatsApp üzerinden 6 haneli kod gönderildi.',
          )}
        </p>
      </div>

      <OtpInput value={code} onChange={setCode} disabled={loading} />
      <div className="flex justify-end">
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

      <Field label={t('New password', 'Yeni şifre')} htmlFor="fp-pass" hint={t('At least 8 characters', 'En az 8 karakter')}>
        <PasswordInput
          id="fp-pass"
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </Field>
      <Field label={t('Repeat new password', 'Yeni şifre (tekrar)')} htmlFor="fp-pass2">
        <PasswordInput
          id="fp-pass2"
          autoComplete="new-password"
          required
          minLength={8}
          value={password2}
          onChange={(e) => setPassword2(e.target.value)}
        />
      </Field>

      <FormError message={error} />
      <SubmitButton loading={loading} disabled={code.length !== 6}>
        {t('Reset password', 'Şifreyi Sıfırla')}
      </SubmitButton>
    </form>
  );
}

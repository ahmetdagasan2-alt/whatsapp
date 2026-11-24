// Copyright (c) Meta Platforms, Inc. and affiliates.
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

'use client';

import { useState } from 'react';
import Link from 'next/link';

import { authErrorMessage, authPost } from '@/app/components/auth/authClient';
import { Field, FormError, PasswordInput, SubmitButton, TextInput } from '@/app/components/auth/fields';
import { useT } from '@/app/i18n/client';

/**
 * When rendered on /login the user is sent to the home page after signing in;
 * when rendered in place of a protected page, that page is simply reloaded.
 */
export default function LoginForm({ redirectTo }: { redirectTo?: string }) {
  const t = useT();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  return (
    <form
      className="space-y-5"
      onSubmit={async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
          await authPost('login', { email, password });
          if (redirectTo) window.location.assign(redirectTo);
          else window.location.reload();
        } catch (err) {
          setError(authErrorMessage(err, t));
          setLoading(false);
        }
      }}
    >
      <Field label={t('Email', 'E-posta')} htmlFor="login-email">
        <TextInput
          id="login-email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="ornek@sirket.com"
        />
      </Field>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label htmlFor="login-password" className="text-sm font-medium text-slate-700">
            {t('Password', 'Şifre')}
          </label>
          <Link href="/forgot-password" className="text-sm font-medium text-brand-600 hover:text-brand-700">
            {t('Forgot password?', 'Şifremi unuttum')}
          </Link>
        </div>
        <PasswordInput
          id="login-password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>

      <FormError message={error} />

      <SubmitButton loading={loading}>{t('Log In', 'Giriş Yap')}</SubmitButton>

      <p className="text-center text-sm text-slate-500">
        {t("Don't have an account?", 'Hesabınız yok mu?')}{' '}
        <Link href="/signup" className="font-semibold text-brand-600 hover:text-brand-700">
          {t('Sign up', 'Kayıt olun')}
        </Link>
      </p>
    </form>
  );
}

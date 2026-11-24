// Copyright (c) Meta Platforms, Inc. and affiliates.
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

import { redirect } from 'next/navigation';

import AuthShell from '@/app/components/auth/AuthShell';
import SignupForm from '@/app/components/auth/SignupForm';
import { getT } from '@/app/i18n/server';
import { auth } from '@/lib/auth';

export default async function SignupPage() {
  if (await auth.getSession()) redirect('/');
  const t = await getT();
  return (
    <AuthShell
      wide
      title={t('Create your account', 'Hesabınızı oluşturun')}
      subtitle={t(
        'Fill in your details. We will verify your phone number via WhatsApp.',
        'Bilgilerinizi girin. Telefon numaranızı WhatsApp üzerinden doğrulayacağız.',
      )}
    >
      <SignupForm />
    </AuthShell>
  );
}

// Copyright (c) Meta Platforms, Inc. and affiliates.
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

import AuthShell from '@/app/components/auth/AuthShell';
import ForgotPasswordForm from '@/app/components/auth/ForgotPasswordForm';
import { getT } from '@/app/i18n/server';

export default async function ForgotPasswordPage() {
  const t = await getT();
  return (
    <AuthShell
      title={t('Reset your password', 'Şifrenizi sıfırlayın')}
      subtitle={t(
        'Enter the email address of your account to receive a code.',
        'Kod almak için hesabınızın e-posta adresini girin.',
      )}
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}

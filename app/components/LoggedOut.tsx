// Copyright (c) Meta Platforms, Inc. and affiliates.
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

import AuthShell from '@/app/components/auth/AuthShell';
import LoginForm from '@/app/components/auth/LoginForm';
import { getT } from '@/app/i18n/server';

/**
 * Shown in place of any protected page when there is no session. After logging
 * in the same page reloads; pass redirectTo to go somewhere else instead.
 */
export default async function LoggedOut({ redirectTo }: { redirectTo?: string } = {}) {
  const t = await getT();
  return (
    <AuthShell
      title={t('Welcome', 'Hoş geldiniz')}
      subtitle={t('Log in to access your dashboard.', 'Panele erişmek için hesabınızla giriş yapın.')}
    >
      <LoginForm redirectTo={redirectTo} />
    </AuthShell>
  );
}

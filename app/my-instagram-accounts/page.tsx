// Copyright (c) Meta Platforms, Inc. and affiliates.
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

import { Instagram } from 'lucide-react';

import { auth } from '@/lib/auth';
import { getInstagramAccounts, getAppDetails } from '@/app/api/beUtils';
import type { InstagramAccountWithDetails } from '@/app/types/api';
import LoggedOut from '@/app/components/LoggedOut';
import WabaPageLayout from '@/app/components/WabaPageLayout';
import InstagramAccountCard from '@/app/components/InstagramAccountCard';
import publicConfig from '@/app/publicConfig';
import { getT } from '@/app/i18n/server';

export default async function MyInstagramAccounts() {
  const session = await auth.getSession();
  if (!session) return <LoggedOut />;

  const userId = session.user.email;
  const t = await getT();
  const appDetails = await getAppDetails(publicConfig.appId);
  const accounts = await getInstagramAccounts(userId);

  return (
    <WabaPageLayout
      title={t('Instagram Accounts', 'Instagram Hesapları')}
      description={t('Instagram accounts connected to your app.', 'Uygulamanıza bağlı Instagram hesapları.')}
      userId={userId}
      logoUrl={appDetails.logo_url}
      appName={appDetails.name}
      isEmpty={accounts.length === 0}
      emptyMessage={t('No Instagram accounts yet.', 'Henüz Instagram hesabı yok.')}
      emptyDescription={t('Your Instagram accounts will appear here once you connect an account from the home page.', 'Ana sayfadan hesap bağladığınızda Instagram hesaplarınız burada görünecek.')}
      icon={<Instagram className="w-10 h-10" />}
    >
      {accounts.map((account: InstagramAccountWithDetails) => (
        <InstagramAccountCard
          key={account.id}
          id={account.id}
          name={account.username || t('Unnamed account', 'İsimsiz hesap')}
          businessId={account.business_id || ''}
        />
      ))}
    </WabaPageLayout>
  );
}

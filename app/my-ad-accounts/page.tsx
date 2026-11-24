// Copyright (c) Meta Platforms, Inc. and affiliates.
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

import { Megaphone } from 'lucide-react';

import { auth0 } from '@/lib/auth0';
import { getAdAccounts, getAppDetails } from '@/app/api/beUtils';
import type { AdAccountWithDetails } from '@/app/types/api';
import LoggedOut from '@/app/components/LoggedOut';
import WabaPageLayout from '@/app/components/WabaPageLayout';
import AdAccountCard from '@/app/components/AdAccountCard';
import publicConfig from '@/app/publicConfig';
import { getT } from '@/app/i18n/server';

export default async function MyAdAccounts() {
  const session = await auth0.getSession();
  if (!session) return <LoggedOut />;

  const userId = session.user.email;
  const t = await getT();
  const appDetails = await getAppDetails(publicConfig.appId);
  const adAccounts = await getAdAccounts(userId);

  return (
    <WabaPageLayout
      title={t('Ad Accounts', 'Reklam Hesapları')}
      description={t('Facebook ad accounts connected to your app.', 'Uygulamanıza bağlı Facebook reklam hesapları.')}
      userId={userId}
      logoUrl={appDetails.logo_url}
      appName={appDetails.name}
      isEmpty={adAccounts.length === 0}
      emptyMessage={t('No ad accounts yet.', 'Henüz reklam hesabı yok.')}
      emptyDescription={t('Your ad accounts will appear here once you connect an account from the home page.', 'Ana sayfadan hesap bağladığınızda reklam hesaplarınız burada görünecek.')}
      icon={<Megaphone className="w-10 h-10" />}
    >
      {adAccounts.map((account: AdAccountWithDetails) => (
        <AdAccountCard
          key={account.ad_account_id}
          adAccountId={account.ad_account_id}
          name={account.name || t('Unnamed account', 'İsimsiz hesap')}
          businessId={account.business_id || ''}
        />
      ))}
    </WabaPageLayout>
  );
}

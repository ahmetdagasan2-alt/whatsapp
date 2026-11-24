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

export default async function MyAdAccounts() {
  const session = await auth0.getSession();
  if (!session) return <LoggedOut />;

  const userId = session.user.email;
  const appDetails = await getAppDetails(publicConfig.appId);
  const adAccounts = await getAdAccounts(userId);

  return (
    <WabaPageLayout
      title="Reklam Hesapları"
      description="Uygulamanıza bağlı Facebook reklam hesapları."
      userId={userId}
      logoUrl={appDetails.logo_url}
      appName={appDetails.name}
      isEmpty={adAccounts.length === 0}
      emptyMessage="Henüz reklam hesabı yok."
      emptyDescription="Kurulum ekranından hesap bağladığınızda reklam hesaplarınız burada görünecek."
      icon={<Megaphone className="w-10 h-10" />}
    >
      {adAccounts.map((account: AdAccountWithDetails) => (
        <AdAccountCard
          key={account.ad_account_id}
          adAccountId={account.ad_account_id}
          name={account.name || 'İsimsiz hesap'}
          businessId={account.business_id || ''}
        />
      ))}
    </WabaPageLayout>
  );
}

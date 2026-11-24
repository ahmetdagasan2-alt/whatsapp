// Copyright (c) Meta Platforms, Inc. and affiliates.
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

import { Instagram } from 'lucide-react';

import { auth0 } from '@/lib/auth0';
import { getInstagramAccounts, getAppDetails } from '@/app/api/beUtils';
import type { InstagramAccountWithDetails } from '@/app/types/api';
import LoggedOut from '@/app/components/LoggedOut';
import WabaPageLayout from '@/app/components/WabaPageLayout';
import InstagramAccountCard from '@/app/components/InstagramAccountCard';
import publicConfig from '@/app/publicConfig';

export default async function MyInstagramAccounts() {
  const session = await auth0.getSession();
  if (!session) return <LoggedOut />;

  const userId = session.user.email;
  const appDetails = await getAppDetails(publicConfig.appId);
  const accounts = await getInstagramAccounts(userId);

  return (
    <WabaPageLayout
      title="Instagram Hesapları"
      description="Uygulamanıza bağlı Instagram hesapları."
      userId={userId}
      logoUrl={appDetails.logo_url}
      appName={appDetails.name}
      isEmpty={accounts.length === 0}
      emptyMessage="Henüz Instagram hesabı yok."
      emptyDescription="Kurulum ekranından hesap bağladığınızda Instagram hesaplarınız burada görünecek."
      icon={<Instagram className="w-10 h-10" />}
    >
      {accounts.map((account: InstagramAccountWithDetails) => (
        <InstagramAccountCard
          key={account.id}
          id={account.id}
          name={account.username || 'İsimsiz hesap'}
          businessId={account.business_id || ''}
        />
      ))}
    </WabaPageLayout>
  );
}

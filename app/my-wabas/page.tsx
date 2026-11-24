// Copyright (c) Meta Platforms, Inc. and affiliates.
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

import { Building2 } from 'lucide-react';

import { auth } from '@/lib/auth';
import { getWabas, getAppDetails } from '@/app/api/beUtils';
import type { WabaWithDetails } from '@/app/types/api';
import LoggedOut from '@/app/components/LoggedOut';
import WabaPageLayout from '@/app/components/WabaPageLayout';
import WabaCard from '@/app/components/WabaCard';
import publicConfig from '@/app/publicConfig';
import { getT } from '@/app/i18n/server';

export default async function MyWabas() {
  const session = await auth.getSession();
  if (!session) return <LoggedOut />;

  const userId = session.user.email;
  const t = await getT();
  const appDetails = await getAppDetails(publicConfig.appId);
  const wabas = await getWabas(userId);

  return (
    <WabaPageLayout
      title={t('WhatsApp Accounts', 'WhatsApp Hesapları')}
      description={t('WhatsApp Business Accounts (WABA) connected to your app.', 'Uygulamanıza bağlı WhatsApp Business hesapları (WABA).')}
      userId={userId}
      logoUrl={appDetails.logo_url}
      appName={appDetails.name}
      isEmpty={wabas.length === 0}
      emptyMessage={t('No WhatsApp accounts yet.', 'Henüz WhatsApp hesabı yok.')}
      emptyDescription={t('Your WhatsApp accounts will appear here once you connect an account from the home page.', 'Ana sayfadan hesap bağladığınızda WhatsApp hesaplarınız burada görünecek.')}
      icon={<Building2 className="w-10 h-10" />}
    >
      {wabas.map((waba: WabaWithDetails, i: number) => (
        <WabaCard
          key={`${waba.id}-${i}`}
          id={waba.id}
          name={waba.name || t('Unnamed WABA', 'İsimsiz WABA')}
          businessId={waba.business_id || ''}
        />
      ))}
    </WabaPageLayout>
  );
}

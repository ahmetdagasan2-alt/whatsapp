// Copyright (c) Meta Platforms, Inc. and affiliates.
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

import { BookOpen } from 'lucide-react';

import { auth } from '@/lib/auth';
import { getCatalogs, getAppDetails } from '@/app/api/beUtils';
import type { CatalogWithDetails } from '@/app/types/api';
import LoggedOut from '@/app/components/LoggedOut';
import WabaPageLayout from '@/app/components/WabaPageLayout';
import CatalogCard from '@/app/components/CatalogCard';
import publicConfig from '@/app/publicConfig';
import { getT } from '@/app/i18n/server';

export default async function MyCatalogs() {
  const session = await auth.getSession();
  if (!session) return <LoggedOut />;

  const userId = session.user.email;
  const t = await getT();
  const appDetails = await getAppDetails(publicConfig.appId);
  const catalogs = await getCatalogs(userId);

  return (
    <WabaPageLayout
      title={t('Catalogs', 'Kataloglar')}
      description={t('Facebook catalogs connected to your app.', 'Uygulamanıza bağlı Facebook katalogları.')}
      userId={userId}
      logoUrl={appDetails.logo_url}
      appName={appDetails.name}
      isEmpty={catalogs.length === 0}
      emptyMessage={t('No catalogs yet.', 'Henüz katalog yok.')}
      emptyDescription={t('Your catalogs will appear here once you connect an account from the home page.', 'Ana sayfadan hesap bağladığınızda kataloglarınız burada görünecek.')}
      icon={<BookOpen className="w-10 h-10" />}
    >
      {catalogs.map((catalog: CatalogWithDetails) => (
        <CatalogCard
          key={catalog.id}
          id={catalog.id}
          name={catalog.name || t('Unnamed catalog', 'İsimsiz katalog')}
          businessId={catalog.business_id || ''}
        />
      ))}
    </WabaPageLayout>
  );
}

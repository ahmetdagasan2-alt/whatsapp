// Copyright (c) Meta Platforms, Inc. and affiliates.
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

import { BookOpen } from 'lucide-react';

import { auth0 } from '@/lib/auth0';
import { getCatalogs, getAppDetails } from '@/app/api/beUtils';
import type { CatalogWithDetails } from '@/app/types/api';
import LoggedOut from '@/app/components/LoggedOut';
import WabaPageLayout from '@/app/components/WabaPageLayout';
import CatalogCard from '@/app/components/CatalogCard';
import publicConfig from '@/app/publicConfig';

export default async function MyCatalogs() {
  const session = await auth0.getSession();
  if (!session) return <LoggedOut />;

  const userId = session.user.email;
  const appDetails = await getAppDetails(publicConfig.appId);
  const catalogs = await getCatalogs(userId);

  return (
    <WabaPageLayout
      title="Kataloglar"
      description="Uygulamanıza bağlı Facebook katalogları."
      userId={userId}
      logoUrl={appDetails.logo_url}
      appName={appDetails.name}
      isEmpty={catalogs.length === 0}
      emptyMessage="Henüz katalog yok."
      emptyDescription="Kurulum ekranından hesap bağladığınızda kataloglarınız burada görünecek."
      icon={<BookOpen className="w-10 h-10" />}
    >
      {catalogs.map((catalog: CatalogWithDetails) => (
        <CatalogCard
          key={catalog.id}
          id={catalog.id}
          name={catalog.name || 'İsimsiz katalog'}
          businessId={catalog.business_id || ''}
        />
      ))}
    </WabaPageLayout>
  );
}

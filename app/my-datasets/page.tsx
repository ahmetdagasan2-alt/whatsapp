// Copyright (c) Meta Platforms, Inc. and affiliates.
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

import { Database } from 'lucide-react';
import { redirect } from 'next/navigation';

import { isAdminEmail } from '@/lib/admin';
import { auth } from '@/lib/auth';
import { getDatasets, getAppDetails } from '@/app/api/beUtils';
import type { DatasetWithDetails } from '@/app/types/api';
import LoggedOut from '@/app/components/LoggedOut';
import WabaPageLayout from '@/app/components/WabaPageLayout';
import DatasetCard from '@/app/components/DatasetCard';
import publicConfig from '@/app/publicConfig';
import { getT } from '@/app/i18n/server';

export default async function MyDatasets() {
  const session = await auth.getSession();
  if (!session) return <LoggedOut />;
  // Admin-only section; other users are sent to the home page.
  if (!isAdminEmail(session.user.email)) redirect('/');

  const userId = session.user.email;
  const t = await getT();
  const appDetails = await getAppDetails(publicConfig.appId);
  const datasets = await getDatasets(userId);

  return (
    <WabaPageLayout
      title={t('Datasets', 'Veri Kümeleri')}
      description={t('Facebook datasets (Pixels) connected to your app.', 'Uygulamanıza bağlı Facebook veri kümeleri (Pixel).')}
      userId={userId}
      logoUrl={appDetails.logo_url}
      appName={appDetails.name}
      isEmpty={datasets.length === 0}
      emptyMessage={t('No datasets yet.', 'Henüz veri kümesi yok.')}
      emptyDescription={t('Your datasets will appear here once you connect an account from the home page.', 'Ana sayfadan hesap bağladığınızda veri kümeleriniz burada görünecek.')}
      icon={<Database className="w-10 h-10" />}
    >
      {datasets.map((dataset: DatasetWithDetails) => (
        <DatasetCard
          key={dataset.id}
          id={dataset.id}
          name={dataset.name || t('Unnamed dataset', 'İsimsiz veri kümesi')}
          businessId={dataset.business_id || ''}
        />
      ))}
    </WabaPageLayout>
  );
}

// Copyright (c) Meta Platforms, Inc. and affiliates.
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

import { FileText } from 'lucide-react';

import { auth0 } from '@/lib/auth0';
import { getPages, getAppDetails } from '@/app/api/beUtils';
import type { PageWithDetails } from '@/app/types/api';
import LoggedOut from '@/app/components/LoggedOut';
import WabaPageLayout from '@/app/components/WabaPageLayout';
import PageCard from '@/app/components/PageCard';
import publicConfig from '@/app/publicConfig';
import { getT } from '@/app/i18n/server';

export default async function MyPages() {
  const session = await auth0.getSession();
  if (!session) return <LoggedOut />;

  const userId = session.user.email;
  const t = await getT();
  const appDetails = await getAppDetails(publicConfig.appId);
  const pages = await getPages(userId);

  return (
    <WabaPageLayout
      title={t('Facebook Pages', 'Facebook Sayfaları')}
      description={t('Facebook pages connected to your app.', 'Uygulamanıza bağlı Facebook sayfaları.')}
      userId={userId}
      logoUrl={appDetails.logo_url}
      appName={appDetails.name}
      isEmpty={pages.length === 0}
      emptyMessage={t('No pages yet.', 'Henüz sayfa yok.')}
      emptyDescription={t('Your Facebook pages will appear here once you connect an account from the home page.', 'Ana sayfadan hesap bağladığınızda Facebook sayfalarınız burada görünecek.')}
      icon={<FileText className="w-10 h-10" />}
    >
      {pages.map((page: PageWithDetails) => (
        <PageCard
          key={page.page_id}
          id={page.page_id}
          name={page.name || t('Unnamed page', 'İsimsiz sayfa')}
          businessId={page.business_id || ''}
        />
      ))}
    </WabaPageLayout>
  );
}

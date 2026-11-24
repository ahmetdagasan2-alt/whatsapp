// Copyright (c) Meta Platforms, Inc. and affiliates.
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

import { auth0 } from '@/lib/auth0';
import SidebarLayout from '@/app/components/SidebarLayout';
import LoggedOut from '@/app/components/LoggedOut';
import publicConfig from '@/app/publicConfig';
import { getT } from '@/app/i18n/server';
import { getAppDetails } from '@/app/api/beUtils';
import LiveWebhooks from '@/app/components/LiveWebhooks';

export default async function MyWebhooks() {
  const session = await auth0.getSession();
  if (!session) return <LoggedOut />;

  const userId = session.user.email;
  const t = await getT();
  const appId = publicConfig.appId;
  const appDetails = await getAppDetails(appId);
  const appName = appDetails.name;
  const logoUrl = appDetails.logo_url;

  return (
    <SidebarLayout userId={userId} logoUrl={logoUrl} appName={appName}>
      <div className="p-4 md:p-8 max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{t('Webhook Logs', 'Webhook Kayıtları')}</h1>
          <p className="text-sm text-slate-500 mt-1">
            {t('Live view of all incoming webhook events for your app.', 'Uygulamanıza gelen tüm webhook olaylarının canlı görünümü.')}
          </p>
        </div>

        <LiveWebhooks appId={appId ?? ''} />
      </div>
    </SidebarLayout>
  );
}

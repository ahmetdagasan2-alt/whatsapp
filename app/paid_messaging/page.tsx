// Copyright (c) Meta Platforms, Inc. and affiliates.
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

import { auth0 } from '@/lib/auth0';
import { getWabas, getAppDetails } from '@/app/api/beUtils';
import type { WabaClientData } from '@/app/types/api';
import LoggedOut from '@/app/components/LoggedOut';
import SidebarLayout from '@/app/components/SidebarLayout';
import PaidMessagingDashboard from '@/app/components/PaidMessagingDashboard';
import publicConfig from '@/app/publicConfig';
import { Mail } from 'lucide-react';

export default async function PaidMessaging() {
  const session = await auth0.getSession();
  if (!session) return <LoggedOut />;

  const userId = session.user.email;
  const appDetails = await getAppDetails(publicConfig.appId);
  const wabas = await getWabas(userId);

  // Strip access_token before passing to client component
  const wabaClientData: WabaClientData[] = wabas.map(waba => ({
    id: waba.id,
    name: waba.name,
    phone_numbers: waba.phone_numbers,
  }));

  return (
    <SidebarLayout userId={userId} logoUrl={appDetails.logo_url} appName={appDetails.name}>
      <div className="p-4 md:p-8 max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Ücretli Mesajlar</h1>
          <p className="text-sm text-slate-500 mt-1">
            WhatsApp Business API üzerinden şablon mesajları ve pazarlama mesajları (Marketing Messages Lite) gönderin.
          </p>
        </div>
        {wabas.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-12 text-center shadow-sm">
            <div className="mb-3 flex justify-center text-gray-300">
              <Mail className="w-10 h-10" />
            </div>
            <p className="text-sm font-medium text-gray-600">Henüz WhatsApp hesabı yok.</p>
            <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
              Kurulum ekranından hesap bağladığınızda WhatsApp hesaplarınız burada görünecek.
            </p>
          </div>
        ) : (
          <PaidMessagingDashboard wabas={wabaClientData} />
        )}
      </div>
    </SidebarLayout>
  );
}

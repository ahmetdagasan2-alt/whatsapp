// Copyright (c) Meta Platforms, Inc. and affiliates.
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

import { auth } from '@/lib/auth';
import SidebarLayout from '@/app/components/SidebarLayout';
import LoggedOut from '@/app/components/LoggedOut';
import publicConfig from '@/app/publicConfig';
import { getAppDetails, getClientPhones } from '@/app/api/beUtils';
import InboxLayout from '@/app/components/InboxLayout';
import { channelForViewer } from '@/lib/realtime';

export default async function Home() {
  const session = await auth.getSession();

  if (!session) {
    return <LoggedOut />;
  }

  const userId = session.user.email;

  const phones = await getClientPhones(userId);

  const appDetails = await getAppDetails(publicConfig.appId);
  const appName = appDetails.name;
  const logoUrl = appDetails.logo_url;

  return (
    <SidebarLayout userId={userId} logoUrl={logoUrl} appName={appName}>
      <div className="h-full flex flex-col">
        <InboxLayout phones={phones} realtimeChannel={channelForViewer(userId)} />
      </div>
    </SidebarLayout>
  );
}

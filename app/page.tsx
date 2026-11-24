// Copyright (c) Meta Platforms, Inc. and affiliates.
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

import HomeSignup from '@/app/components/HomeSignup';
import SidebarLayout from '@/app/components/SidebarLayout';
import LoggedOut from '@/app/components/LoggedOut';
import publicConfig from '@/app/publicConfig';
import { getAppDetails } from '@/app/api/beUtils';
import { auth0 } from '@/lib/auth0';

const { appId, publicEsVersions } = publicConfig;

export default async function Home() {
  // Fetch the user session
  const session = await auth0.getSession();

  // If no session, show the logged out component
  if (!session) {
    return <LoggedOut />;
  }

  const userId = session.user.email;
  const appDetails = await getAppDetails(appId);
  const appName = appDetails.name;
  const logoUrl = appDetails.logo_url;
  const tpConfigs = appDetails.config_ids ?? [];

  return (
    <SidebarLayout userId={userId} logoUrl={logoUrl} appName={appName}>
      <HomeSignup
        appId={appId}
        appName={appName}
        userId={userId}
        tpConfigs={tpConfigs}
        publicEsVersions={publicEsVersions}
      />
    </SidebarLayout>
  );
}

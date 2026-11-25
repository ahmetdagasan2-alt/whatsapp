// Copyright (c) Meta Platforms, Inc. and affiliates.
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

import { describe, it, expect, vi, afterEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { NextRequest, NextResponse } from 'next/server';

const currentSession = vi.hoisted(() => ({ value: null as null | { user: { email: string } } }));

vi.mock('next/navigation', () => ({ usePathname: () => '/', useRouter: () => ({ refresh: () => {} }) }));
vi.mock('@/lib/auth', () => ({ auth: { getSession: async () => currentSession.value } }));

import SidebarLayout from '@/app/components/SidebarLayout';
import { withAdmin } from '@/app/api/authWrapper';
import { isAdminEmail } from '@/lib/admin';

const ADMIN_ONLY = ['Paid Messages', 'Facebook Pages', 'Ad Accounts', 'Datasets', 'Catalogs', 'Instagram Accounts'];
const EVERYONE = ['Home', 'Inbox', 'WhatsApp Accounts', 'Webhook Logs'];

describe('isAdminEmail', () => {
  it('matches the support account case-insensitively', () => {
    expect(isAdminEmail('destek@dekatre.com')).toBe(true);
    expect(isAdminEmail(' Destek@Dekatre.com ')).toBe(true);
    expect(isAdminEmail('musteri@example.com')).toBe(false);
    expect(isAdminEmail(undefined)).toBe(false);
  });
});

describe('sidebar menu', () => {
  afterEach(cleanup);

  it('hides admin-only sections from regular users', () => {
    render(
      <SidebarLayout userId="musteri@example.com" appName="x">
        <div />
      </SidebarLayout>,
    );
    for (const label of EVERYONE) expect(screen.getByText(label)).toBeInTheDocument();
    for (const label of ADMIN_ONLY) expect(screen.queryByText(label)).not.toBeInTheDocument();
  });

  it('shows every section to the admin', () => {
    render(
      <SidebarLayout userId="destek@dekatre.com" appName="x">
        <div />
      </SidebarLayout>,
    );
    for (const label of [...EVERYONE, ...ADMIN_ONLY]) expect(screen.getByText(label)).toBeInTheDocument();
  });
});

describe('withAdmin', () => {
  const handler = withAdmin(async () => NextResponse.json({ ok: true }));
  const request = new NextRequest('http://localhost/api/paid_messaging/templates');

  it('rejects signed-out and non-admin users', async () => {
    currentSession.value = null;
    expect((await handler(request)).status).toBe(401);
    currentSession.value = { user: { email: 'musteri@example.com' } };
    expect((await handler(request)).status).toBe(403);
  });

  it('lets the admin through', async () => {
    currentSession.value = { user: { email: 'destek@dekatre.com' } };
    expect((await handler(request)).status).toBe(200);
  });
});

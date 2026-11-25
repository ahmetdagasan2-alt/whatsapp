// Copyright (c) Meta Platforms, Inc. and affiliates.
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

process.env.SESSION_SECRET = 'test-secret-test-secret-test-secret-1234';

const db = vi.hoisted(() => ({ queries: [] as { text: string; values: unknown[] }[], rows: [] as Record<string, unknown>[] }));
const tokenRequests = vi.hoisted(() => [] as Record<string, unknown>[]);
const session = vi.hoisted(() => ({ email: 'musteri-a@example.com' }));

vi.mock('@vercel/postgres', () => ({
  sql: async (strings: TemplateStringsArray, ...values: unknown[]) => {
    db.queries.push({ text: strings.join('?').replace(/\s+/g, ' ').trim(), values });
    return { rows: db.rows, rowCount: db.rows.length };
  },
}));
vi.mock('@/lib/auth', () => ({ auth: { getSession: async () => ({ user: { email: session.email } }) } }));
vi.mock('ably', () => ({
  default: {
    Realtime: class {
      auth = {
        createTokenRequest: async (params: Record<string, unknown>) => {
          tokenRequests.push(params);
          return { keyName: 'k' };
        },
      };
      close() {}
    },
  },
}));
vi.mock('@/app/privateConfig', () => ({ default: async () => ({ ablyKey: 'app.key:secret' }) }));

import { getTokenForWaba, getWabaOwners, userCanAccessPhone } from '@/app/api/beUtils';
import { GET as ablyAuth } from '@/app/api/ably-auth/route';
import { ADMIN_CHANNEL, channelForViewer, channelsForOwners, userChannel } from '@/lib/realtime';

beforeEach(() => {
  db.queries.length = 0;
  db.rows = [];
  tokenRequests.length = 0;
});

describe('realtime channels', () => {
  it('gives each customer an opaque channel and the admin the admin channel', () => {
    const a = userChannel('Musteri-A@Example.com');
    expect(a).toBe(userChannel('musteri-a@example.com'));
    expect(a).not.toContain('musteri');
    expect(a).not.toBe(userChannel('musteri-b@example.com'));
    expect(channelForViewer('destek@dekatre.com')).toBe(ADMIN_CHANNEL);
    expect(channelForViewer('musteri-a@example.com')).toBe(a);
  });

  it('fans a webhook out to its owners plus the admin', () => {
    expect(channelsForOwners(['musteri-a@example.com'])).toEqual([userChannel('musteri-a@example.com'), ADMIN_CHANNEL]);
    expect(channelsForOwners([])).toEqual([ADMIN_CHANNEL]);
  });
});

describe('Ably token', () => {
  it("only lets a customer subscribe to their own channel", async () => {
    session.email = 'musteri-a@example.com';
    await ablyAuth(new NextRequest('http://localhost/api/ably-auth'));
    expect(JSON.parse(tokenRequests[0].capability as string)).toEqual({
      [userChannel('musteri-a@example.com')]: ['subscribe'],
    });
  });

  it('lets the admin subscribe to the admin channel', async () => {
    session.email = 'destek@dekatre.com';
    await ablyAuth(new NextRequest('http://localhost/api/ably-auth'));
    expect(JSON.parse(tokenRequests[0].capability as string)).toEqual({ [ADMIN_CHANNEL]: ['subscribe'] });
  });
});

describe('token lookup', () => {
  it("limits customers to tokens they stored themselves", async () => {
    db.rows = [{ access_token: 'tok-a' }];
    await getTokenForWaba('waba1', 'musteri-a@example.com');
    expect(db.queries[0].text).toMatch(/AND user_id = \?/);
    expect(db.queries[0].values).toContain('musteri-a@example.com');
  });

  it("lets the admin use any customer's token for the WABA", async () => {
    db.rows = [{ access_token: 'tok-a', app_id: 'x' }];
    await expect(getTokenForWaba('waba1', 'destek@dekatre.com')).resolves.toBe('tok-a');
    expect(db.queries[0].text).not.toMatch(/user_id/);
  });

  it('lists the owners of a WABA', async () => {
    db.rows = [{ user_id: 'musteri-a@example.com' }, { user_id: 'musteri-c@example.com' }];
    await expect(getWabaOwners('waba1')).resolves.toEqual(['musteri-a@example.com', 'musteri-c@example.com']);
  });
});

describe('phone access (AckBot settings)', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ json: async () => ({ data: [{ id: '111' }, { id: '222' }] }) }),
    );
  });

  it("allows a customer's own phone and refuses phones outside their WABA", async () => {
    db.rows = [{ access_token: 'tok-a' }];
    await expect(userCanAccessPhone('musteri-a@example.com', 'waba1', '111')).resolves.toBe(true);
    await expect(userCanAccessPhone('musteri-a@example.com', 'waba1', '999')).resolves.toBe(false);
  });

  it('refuses a WABA the customer never connected', async () => {
    db.rows = [];
    await expect(userCanAccessPhone('musteri-b@example.com', 'waba1', '111')).resolves.toBe(false);
  });
});

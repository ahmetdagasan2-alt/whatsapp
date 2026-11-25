// Copyright (c) Meta Platforms, Inc. and affiliates.
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

process.env.SESSION_SECRET = 'test-secret-test-secret-test-secret-1234';

const published = vi.hoisted(() => [] as { channel: string; name: string; data: unknown }[]);
const owners = vi.hoisted(() => ({ byWaba: {} as Record<string, string[]> }));
const ackbot = vi.hoisted(() => ({ enabled: true, fail: true }));

vi.mock('next/server', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/server')>()),
  after: () => {},
}));
vi.mock('ably', () => ({
  default: {
    Realtime: class {
      connection = { once: async () => {} };
      channels = {
        get: (channel: string) => ({
          publish: async (name: string, data: unknown): Promise<void> => {
            published.push({ channel, name, data });
          },
        }),
      };
      close() {}
    },
  },
}));
vi.mock('@/app/privateConfig', () => ({ default: async () => ({ ablyKey: 'k', fbVerifyToken: 'v' }) }));
vi.mock('@/app/api/sap/sapRouter', () => ({ dispatchWebhookToSap: async () => {} }));
vi.mock('@/app/api/beUtils', () => ({
  getWabaOwners: async (wabaId: string) => owners.byWaba[wabaId] ?? [],
  getAckBotStatus: async () => ackbot.enabled,
  getAckBotMessage: async () => 'Merhaba',
  sendWithWabaToken: async () => {
    if (ackbot.fail) throw { code: 190, message: 'Invalid OAuth access token' };
    return { messages: [{ id: 'wamid.reply' }] };
  },
}));

import { POST } from '@/app/api/webhooks/route';
import { ADMIN_CHANNEL, userChannel } from '@/lib/realtime';

function incoming(wabaId: string) {
  return new NextRequest('http://localhost/api/webhooks', {
    method: 'POST',
    body: JSON.stringify({
      object: 'whatsapp_business_account',
      entry: [
        {
          id: wabaId,
          changes: [
            {
              field: 'messages',
              value: {
                metadata: { phone_number_id: 'phone1' },
                messages: [{ id: 'wamid.1', from: '905321234567', type: 'text', text: { body: 'Selam' } }],
              },
            },
          ],
        },
      ],
    }),
  });
}

beforeEach(() => {
  published.length = 0;
  owners.byWaba = { waba1: ['musteri-a@example.com'], waba2: ['musteri-b@example.com'] };
  ackbot.enabled = true;
  ackbot.fail = true;
});

describe('webhook fan-out', () => {
  it("sends a customer's webhook only to that customer and the admin", async () => {
    ackbot.enabled = false;
    const res = await POST(incoming('waba1'));
    expect(res.status).toBe(200);
    const channels = published.map((p) => p.channel).sort();
    expect(channels).toEqual([ADMIN_CHANNEL, userChannel('musteri-a@example.com')].sort());
    expect(channels).not.toContain(userChannel('musteri-b@example.com'));
  });

  it('sends webhooks of an unknown WABA to the admin only', async () => {
    ackbot.enabled = false;
    await POST(incoming('waba-unknown'));
    expect(published.map((p) => p.channel)).toEqual([ADMIN_CHANNEL]);
  });

  it('publishes the AckBot reply to the same channels', async () => {
    ackbot.fail = false;
    await POST(incoming('waba1'));
    const replies = published.filter(
      (p) => JSON.stringify(p.data).includes('_ackbot_'),
    );
    expect(replies.map((p) => p.channel).sort()).toEqual([ADMIN_CHANNEL, userChannel('musteri-a@example.com')].sort());
  });
});

describe('webhook with a failing AckBot reply', () => {
  it('still answers Meta with 200 so the message is not redelivered', async () => {
    const res = await POST(incoming('waba1'));
    expect(res.status).toBe(200);
    // the incoming message once per channel (customer + admin); no AckBot echo
    expect(published).toHaveLength(2);
  });
});

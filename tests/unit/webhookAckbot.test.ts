// Copyright (c) Meta Platforms, Inc. and affiliates.
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

import { describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';

const published = vi.hoisted(() => [] as unknown[]);

vi.mock('next/server', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/server')>()),
  after: () => {},
}));
vi.mock('ably', () => ({
  default: {
    Realtime: class {
      connection = { once: async () => {} };
      channels = { get: () => ({ publish: async (_name: string, data: unknown): Promise<void> => {
          published.push(data);
        },
      }) };
      close() {}
    },
  },
}));
vi.mock('@/app/privateConfig', () => ({ default: async () => ({ ablyKey: 'k', fbVerifyToken: 'v' }) }));
vi.mock('@/app/api/sap/sapRouter', () => ({ dispatchWebhookToSap: async () => {} }));
vi.mock('@/app/api/beUtils', () => ({
  getAckBotStatus: async () => true,
  getAckBotMessage: async () => 'Merhaba',
  sendWithWabaToken: async () => {
    throw { code: 190, message: 'Invalid OAuth access token' };
  },
}));

import { POST } from '@/app/api/webhooks/route';

describe('webhook with a failing AckBot reply', () => {
  it('still answers Meta with 200 so the message is not redelivered', async () => {
    const body = {
      object: 'whatsapp_business_account',
      entry: [
        {
          id: 'waba1',
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
    };
    const res = await POST(new NextRequest('http://localhost/api/webhooks', { method: 'POST', body: JSON.stringify(body) }));
    expect(res.status).toBe(200);
    expect(published).toHaveLength(1); // the incoming message, published once; no AckBot echo
  });
});

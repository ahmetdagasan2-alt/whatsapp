// Copyright (c) Meta Platforms, Inc. and affiliates.
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

import { describe, it, expect, vi, beforeEach } from 'vitest';

const db = vi.hoisted(() => ({
  queries: [] as string[],
  rows: [] as Record<string, unknown>[],
  rowCount: 0,
}));

vi.mock('@vercel/postgres', () => ({
  sql: async (strings: TemplateStringsArray) => {
    db.queries.push(strings.join('?').replace(/\s+/g, ' ').trim());
    return { rows: db.rows, rowCount: db.rowCount };
  },
}));

import { getAckBotStatus, sendWithWabaToken, setAckBotStatus } from '@/app/api/beUtils';

beforeEach(() => {
  db.queries.length = 0;
  db.rows = [];
  db.rowCount = 0;
});

describe('getAckBotStatus', () => {
  it('reads the BOOLEAN column Postgres returns as a real boolean', async () => {
    db.rows = [{ is_ack_bot_enabled: true }];
    expect(await getAckBotStatus('1')).toBe(true);
    db.rows = [{ is_ack_bot_enabled: false }];
    expect(await getAckBotStatus('1')).toBe(false);
  });

  it('still accepts text values and treats a missing row as off', async () => {
    db.rows = [{ is_ack_bot_enabled: 'true' }];
    expect(await getAckBotStatus('1')).toBe(true);
    db.rows = [];
    expect(await getAckBotStatus('1')).toBe(false);
  });
});

describe('setAckBotStatus', () => {
  it('updates an existing row without needing a UNIQUE constraint', async () => {
    db.rowCount = 1;
    await setAckBotStatus('1', true, 'a@b.com', 'Merhaba');
    expect(db.queries).toHaveLength(1);
    expect(db.queries[0]).toMatch(/^UPDATE phones/);
    expect(db.queries.join(' ')).not.toMatch(/ON CONFLICT/);
  });

  it('inserts when the phone has no row yet', async () => {
    db.rowCount = 0;
    await setAckBotStatus('1', true, 'a@b.com');
    expect(db.queries).toHaveLength(2);
    expect(db.queries[1]).toMatch(/^INSERT INTO phones/);
  });
});

describe('sendWithWabaToken', () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  const graphReply = (body: unknown) => ({ json: async () => body });
  const usedTokens = () => fetchMock.mock.calls.map(([, init]) => (init.headers as Record<string, string>).Authorization);

  it('falls back to an older token when the newest one is rejected', async () => {
    db.rows = [
      { access_token: 'stale', app_id: 'other' },
      { access_token: 'good', app_id: 'other' },
    ];
    fetchMock
      .mockResolvedValueOnce(graphReply({ error: { code: 190, message: 'Invalid OAuth access token' } }))
      .mockResolvedValueOnce(graphReply({ messages: [{ id: 'wamid.1' }] }));

    await expect(sendWithWabaToken('waba', 'phone', '905321234567', 'Merhaba')).resolves.toMatchObject({
      messages: [{ id: 'wamid.1' }],
    });
    expect(usedTokens()).toEqual(['Bearer stale', 'Bearer good']);
  });

  it('does not retry errors that are not about the token', async () => {
    db.rows = [{ access_token: 'a', app_id: 'x' }, { access_token: 'b', app_id: 'x' }];
    fetchMock.mockResolvedValue(graphReply({ error: { code: 131047, message: 'Re-engagement message' } }));
    await expect(sendWithWabaToken('waba', 'phone', '905321234567', 'Merhaba')).rejects.toMatchObject({ code: 131047 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('fails clearly when no token is stored', async () => {
    db.rows = [];
    await expect(sendWithWabaToken('waba', 'phone', '905321234567', 'x')).rejects.toThrow(/No access token/);
  });
});

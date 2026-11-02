import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@vercel/postgres', () => ({ sql: vi.fn() }));

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

import { sql } from '@vercel/postgres';
import { extractSapEvents } from '@/app/api/sap/events';
import { dispatchWebhookToSap } from '@/app/api/sap/sapRouter';

const messagePayload = {
  object: 'whatsapp_business_account',
  entry: [
    {
      id: '111',
      changes: [
        {
          field: 'messages',
          value: {
            metadata: { phone_number_id: '222', display_phone_number: '905551112233' },
            contacts: [{ wa_id: '905559998877', profile: { name: 'Ali' } }],
            messages: [{ id: 'wamid.1', from: '905559998877', type: 'text', timestamp: '1700000000', text: { body: 'Sipariş durumu?' } }],
          },
        },
      ],
    },
  ],
};

const route = {
  key: '1',
  waba_id: '111',
  phone_number_id: null as string | null,
  tenant_name: 'Firma A',
  base_url: 'https://sap.example.com/odata/ZWA_SRV/',
  auth_type: 'basic',
  credential_key: 'firma_a',
  endpoints: { message: '/MessageSet' },
  csrf: true,
  enabled: true,
};

describe('extractSapEvents', () => {
  it('extracts message with waba and phone ids', () => {
    const [ev] = extractSapEvents(messagePayload);
    expect(ev).toMatchObject({
      eventType: 'message',
      wabaId: '111',
      phoneNumberId: '222',
      from: '905559998877',
      contactName: 'Ali',
      text: 'Sipariş durumu?',
    });
  });

  it('extracts statuses', () => {
    const events = extractSapEvents({
      object: 'whatsapp_business_account',
      entry: [{ id: '111', changes: [{ field: 'messages', value: { metadata: { phone_number_id: '222' }, statuses: [{ id: 'wamid.2', status: 'read', recipient_id: '90555' }] } }] }],
    });
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ eventType: 'status', status: 'read', messageId: 'wamid.2' });
  });

  it('ignores non-whatsapp objects', () => {
    expect(extractSapEvents({ object: 'page', entry: [] })).toEqual([]);
  });
});

describe('dispatchWebhookToSap', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SAP_FIRMA_A_USER = 'u';
    process.env.SAP_FIRMA_A_PASSWORD = 'p';
    process.env.SAP_FIRMA_A_CLIENT = '100';
  });

  it('posts to the routed SAP endpoint with CSRF token', async () => {
    vi.mocked(sql).mockResolvedValueOnce({ rows: [route] } as never).mockResolvedValue({ rows: [] } as never);
    mockFetch
      .mockResolvedValueOnce(new Response(null, { headers: { 'x-csrf-token': 'tok', 'set-cookie': 'SAP_SESSIONID=abc; path=/' } }))
      .mockResolvedValueOnce(new Response('{}', { status: 201 }));

    await dispatchWebhookToSap(messagePayload);

    expect(mockFetch).toHaveBeenCalledTimes(2);
    const [url, init] = mockFetch.mock.calls[1];
    expect(url).toBe('https://sap.example.com/odata/ZWA_SRV/MessageSet?sap-client=100');
    expect(init.headers['X-CSRF-Token']).toBe('tok');
    expect(init.headers['Cookie']).toBe('SAP_SESSIONID=abc');
    expect(init.headers['Authorization']).toBe('Basic ' + Buffer.from('u:p').toString('base64'));
    expect(JSON.parse(init.body)).toMatchObject({ Tenant: 'Firma A', WabaId: '111', PhoneNumberId: '222', Text: 'Sipariş durumu?' });
  });

  it('does not call SAP when no route matches', async () => {
    vi.mocked(sql).mockResolvedValue({ rows: [] } as never);
    await dispatchWebhookToSap(messagePayload);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('skips event types without an endpoint', async () => {
    vi.mocked(sql).mockResolvedValueOnce({ rows: [{ ...route, endpoints: { status: '/StatusSet' } }] } as never).mockResolvedValue({ rows: [] } as never);
    await dispatchWebhookToSap(messagePayload);
    expect(mockFetch).not.toHaveBeenCalled();
  });
});

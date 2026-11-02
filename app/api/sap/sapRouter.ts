// Routes normalized webhook events to the right SAP service based on the
// WABA ID / phone number ID that the event came from.
//
// Lookup order for an event: exact phone_number_id route, then waba_id route.
// Each route maps event types (message, status, call, other) to a path on the
// tenant's SAP base URL; event types without a path are not forwarded.

import { sql } from '@vercel/postgres';

import { callSap, loadCredentials, type SapAuthType } from '@/app/api/sap/sapClient';
import { extractSapEvents, type SapEvent, type SapEventType } from '@/app/api/sap/events';

export interface SapRoute {
  key: string;
  waba_id: string | null;
  phone_number_id: string | null;
  tenant_name: string;
  base_url: string;
  auth_type: SapAuthType;
  credential_key: string;
  endpoints: Partial<Record<SapEventType, string>>;
  csrf: boolean;
  enabled: boolean;
}

async function findRoute(event: SapEvent): Promise<SapRoute | undefined> {
  const { rows } = await sql<SapRoute>`
    SELECT key, waba_id::text, phone_number_id::text, tenant_name, base_url, auth_type,
           credential_key, endpoints, csrf, enabled
    FROM sap_routes
    WHERE enabled
      AND (phone_number_id = ${event.phoneNumberId ?? null}
           OR (waba_id = ${event.wabaId} AND phone_number_id IS NULL))
    ORDER BY phone_number_id IS NULL
    LIMIT 1
  `;
  return rows[0];
}

export function buildSapPayload(event: SapEvent, route: Pick<SapRoute, 'tenant_name'>) {
  return {
    Tenant: route.tenant_name,
    EventType: event.eventType,
    Field: event.field,
    WabaId: event.wabaId,
    PhoneNumberId: event.phoneNumberId ?? '',
    DisplayPhoneNumber: event.displayPhoneNumber ?? '',
    From: event.from ?? '',
    ContactName: event.contactName ?? '',
    MessageId: event.messageId ?? '',
    MessageType: event.messageType ?? '',
    Text: event.text ?? '',
    Status: event.status ?? '',
    RecipientId: event.recipientId ?? '',
    Timestamp: event.timestamp ?? '',
    RawJson: JSON.stringify(event.raw),
  };
}

async function logDispatch(event: SapEvent, route: SapRoute | undefined, status: string, detail: string) {
  try {
    await sql`
      INSERT INTO sap_dispatch_log (route_key, waba_id, phone_number_id, event_type, message_id, status, detail)
      VALUES (${route?.key ?? null}, ${event.wabaId}, ${event.phoneNumberId ?? null}, ${event.eventType},
              ${event.messageId ?? null}, ${status}, ${detail.slice(0, 2000)})
    `;
  } catch (e) {
    console.error('[SAP] Failed to write dispatch log:', e);
  }
}

export async function dispatchEvent(event: SapEvent): Promise<void> {
  const route = await findRoute(event);
  if (!route) {
    console.log('[SAP] No route for waba', event.wabaId, 'phone', event.phoneNumberId);
    await logDispatch(event, undefined, 'no_route', '');
    return;
  }

  const path = route.endpoints?.[event.eventType];
  if (!path) {
    await logDispatch(event, route, 'skipped', `no endpoint for ${event.eventType}`);
    return;
  }

  const url = route.base_url.replace(/\/+$/, '') + '/' + path.replace(/^\/+/, '');
  try {
    const res = await callSap(loadCredentials(route.credential_key, route.auth_type), {
      url,
      body: buildSapPayload(event, route),
      csrf: route.csrf,
    });
    console.log('[SAP] Dispatched', event.eventType, 'to', route.tenant_name, res.status);
    await logDispatch(event, route, 'ok', `${res.status}`);
  } catch (e) {
    console.error('[SAP] Dispatch failed for', route.tenant_name, e);
    await logDispatch(event, route, 'error', e instanceof Error ? e.message : String(e));
  }
}

export async function dispatchWebhookToSap(payload: unknown): Promise<void> {
  const events = extractSapEvents(payload as Parameters<typeof extractSapEvents>[0]);
  await Promise.allSettled(events.map(dispatchEvent));
}

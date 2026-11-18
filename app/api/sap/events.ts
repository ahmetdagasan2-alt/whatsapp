// Splits a WhatsApp Business webhook into one routable unit per entry/change.
// Each unit's payload keeps Meta's original structure (object → entry[] → changes[])
// with only that change in it, so a webhook with a single change (the usual case)
// is forwarded to SAP exactly as received.

export type SapEventType = 'message' | 'status' | 'call' | 'other';

export interface SapEvent {
  eventType: SapEventType;
  field: string;
  wabaId: string;
  phoneNumberId?: string;
  messageId?: string;
  payload: WebhookPayload;
}

interface WebhookChange {
  field?: string;
  value?: {
    metadata?: { phone_number_id?: string };
    messages?: { id?: string; [key: string]: unknown }[];
    statuses?: { id?: string; [key: string]: unknown }[];
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

interface WebhookEntry {
  id?: string;
  changes?: WebhookChange[];
  [key: string]: unknown;
}

export interface WebhookPayload {
  object?: string;
  entry?: WebhookEntry[];
  [key: string]: unknown;
}

function eventTypeOf(change: WebhookChange): SapEventType {
  if (change.field === 'calls') return 'call';
  if (change.value?.messages?.length) return 'message';
  if (change.value?.statuses?.length) return 'status';
  return 'other';
}

export function extractSapEvents(payload: WebhookPayload): SapEvent[] {
  if (payload?.object !== 'whatsapp_business_account') return [];

  const events: SapEvent[] = [];
  for (const entry of payload.entry ?? []) {
    if (!entry.id) continue;
    for (const change of entry.changes ?? []) {
      events.push({
        eventType: eventTypeOf(change),
        field: change.field || 'messages',
        wabaId: entry.id,
        phoneNumberId: change.value?.metadata?.phone_number_id,
        messageId: change.value?.messages?.[0]?.id ?? change.value?.statuses?.[0]?.id,
        payload: { ...payload, entry: [{ ...entry, changes: [change] }] },
      });
    }
  }
  return events;
}

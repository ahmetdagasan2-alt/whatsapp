// Normalizes WhatsApp Business webhook payloads into flat events that can be
// routed to a tenant's SAP system by WABA ID / phone number ID.

export type SapEventType = 'message' | 'status' | 'call' | 'other';

export interface SapEvent {
  eventType: SapEventType;
  field: string;
  wabaId: string;
  phoneNumberId?: string;
  displayPhoneNumber?: string;
  from?: string;
  contactName?: string;
  messageId?: string;
  messageType?: string;
  text?: string;
  status?: string;
  recipientId?: string;
  timestamp?: string;
  raw: unknown;
}

interface WebhookChange {
  field?: string;
  value?: {
    metadata?: { phone_number_id?: string; display_phone_number?: string };
    contacts?: { wa_id?: string; profile?: { name?: string } }[];
    messages?: {
      id?: string;
      from?: string;
      type?: string;
      timestamp?: string;
      text?: { body?: string };
      button?: { text?: string };
      interactive?: { button_reply?: { title?: string }; list_reply?: { title?: string } };
    }[];
    statuses?: { id?: string; status?: string; recipient_id?: string; timestamp?: string }[];
    calls?: unknown[];
  };
}

interface WebhookPayload {
  object?: string;
  entry?: { id?: string; changes?: WebhookChange[] }[];
}

export function extractSapEvents(payload: WebhookPayload): SapEvent[] {
  if (payload?.object !== 'whatsapp_business_account') return [];

  const events: SapEvent[] = [];
  for (const entry of payload.entry ?? []) {
    const wabaId = entry.id;
    if (!wabaId) continue;

    for (const change of entry.changes ?? []) {
      const field = change.field || 'messages';
      const value = change.value ?? {};
      const base = {
        field,
        wabaId,
        phoneNumberId: value.metadata?.phone_number_id,
        displayPhoneNumber: value.metadata?.display_phone_number,
      };

      if (value.messages?.length) {
        for (const msg of value.messages) {
          const contact = value.contacts?.find((c) => c.wa_id === msg.from) ?? value.contacts?.[0];
          events.push({
            ...base,
            eventType: 'message',
            from: msg.from,
            contactName: contact?.profile?.name,
            messageId: msg.id,
            messageType: msg.type,
            text:
              msg.text?.body ??
              msg.button?.text ??
              msg.interactive?.button_reply?.title ??
              msg.interactive?.list_reply?.title,
            timestamp: msg.timestamp,
            raw: msg,
          });
        }
      }

      if (value.statuses?.length && field !== 'calls') {
        for (const st of value.statuses) {
          events.push({
            ...base,
            eventType: 'status',
            messageId: st.id,
            status: st.status,
            recipientId: st.recipient_id,
            timestamp: st.timestamp,
            raw: st,
          });
        }
      }

      if (field === 'calls') {
        events.push({ ...base, eventType: 'call', raw: value });
      } else if (!value.messages?.length && !value.statuses?.length) {
        // account_update, message_template_status_update, etc.
        events.push({ ...base, eventType: 'other', raw: value });
      }
    }
  }
  return events;
}

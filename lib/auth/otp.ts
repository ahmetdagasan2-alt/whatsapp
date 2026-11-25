// Copyright (c) Meta Platforms, Inc. and affiliates.
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

import { createHmac, randomBytes, randomInt, timingSafeEqual } from 'crypto';

export const OTP_TTL_MINUTES = 10;
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_RESEND_COOLDOWN_SECONDS = 60;
export const OTP_MAX_SENDS_PER_HOUR = 5;

export function generateCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, '0');
}

export function generateRequestId(): string {
  return randomBytes(18).toString('base64url');
}

function secret(): string {
  return process.env.SESSION_SECRET?.trim() || process.env.AUTH0_SECRET?.trim() || '';
}

export function hashCode(requestId: string, code: string): string {
  return createHmac('sha256', secret()).update(`${requestId}:${code}`).digest('hex');
}

export function codeMatches(requestId: string, code: string, storedHash: string): boolean {
  const a = Buffer.from(hashCode(requestId, code));
  const b = Buffer.from(storedHash);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function otpExpiry(): Date {
  return new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);
}

export class OtpNotConfiguredError extends Error {}
export class OtpSendError extends Error {
  constructor(
    message: string,
    public readonly metaCode?: number,
  ) {
    super(message);
  }
}

interface OtpConfig {
  phoneNumberId: string;
  accessToken: string;
  templateName: string;
  templateLanguage: string;
}

/** Tolerates values pasted with surrounding quotes, whitespace/newlines or a "Bearer " prefix. */
export function cleanEnvValue(value: string | undefined): string {
  return (value ?? '')
    .trim()
    .replace(/^(['"])([\s\S]*)\1$/, '$2')
    .replace(/^Bearer\s+/i, '')
    .replace(/\s+/g, '');
}

function getOtpConfig(): OtpConfig | null {
  const phoneNumberId = cleanEnvValue(process.env.WA_OTP_PHONE_NUMBER_ID);
  const accessToken = cleanEnvValue(process.env.WA_OTP_ACCESS_TOKEN);
  const templateName = cleanEnvValue(process.env.WA_OTP_TEMPLATE_NAME);
  if (!phoneNumberId || !accessToken || !templateName) return null;
  return {
    phoneNumberId,
    accessToken,
    templateName,
    templateLanguage: cleanEnvValue(process.env.WA_OTP_TEMPLATE_LANGUAGE) || 'tr',
  };
}

/**
 * Sends the code with an approved WhatsApp AUTHENTICATION template (copy-code
 * button) from Dekatre's own business number.
 */
export async function sendOtpViaWhatsApp(phoneE164: string, code: string): Promise<void> {
  const config = getOtpConfig();
  if (!config) {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[auth] WhatsApp OTP not configured — dev code for ${phoneE164}: ${code}`);
      return;
    }
    throw new OtpNotConfiguredError('WhatsApp OTP sender is not configured');
  }

  const response = await fetch(
    `https://graph.facebook.com/${process.env.FB_GRAPH_API_VERSION}/${config.phoneNumberId}/messages`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.accessToken}` },
      cache: 'no-store',
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: phoneE164.replace(/^\+/, ''),
        type: 'template',
        template: {
          name: config.templateName,
          language: { code: config.templateLanguage },
          components: [
            { type: 'body', parameters: [{ type: 'text', text: code }] },
            { type: 'button', sub_type: 'url', index: '0', parameters: [{ type: 'text', text: code }] },
          ],
        },
      }),
    },
  );
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.error) {
    const e = data.error ?? {};
    console.error(
      '[auth] OTP send failed:',
      JSON.stringify({
        status: response.status,
        code: e.code,
        subcode: e.error_subcode,
        type: e.type,
        message: e.message,
        details: e.error_data?.details,
        fbtrace_id: e.fbtrace_id,
        template: config.templateName,
        language: config.templateLanguage,
        phoneNumberId: config.phoneNumberId,
      }),
    );
    throw new OtpSendError(e.message ?? 'OTP send failed', e.code ?? response.status);
  }
}
